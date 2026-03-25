import { Injectable } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, collectionData, docData } from '@angular/fire/firestore';
import { collection, Timestamp, updateDoc, increment } from 'firebase/firestore';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RoomService {

  constructor(private firestore: Firestore) { }
  private docFn = doc;
  private getDocFn = getDoc;
  private setDocFn = setDoc;
  private updateDocFn = updateDoc;
  private collectionFn = collection;
  private collectionDataFn = collectionData;
  private docDataFn = docData;
  private incrementFn = increment;
  private nowFn = Timestamp.now;
  private fromDateFn = Timestamp.fromDate;
  private randomFn = Math.random;

  async createRoom(name: string, code: string, createdBy: string, options: string[], durationMinutes: number) {

    const roomRef = this.docFn(this.firestore, `rooms/${code}`);

    const existingRoom = await this.getDocFn(roomRef);

    if (existingRoom.exists()) {
      throw new Error('Room code already exists');
    }

    const votes: Record<string, number> = {};
    options.forEach(option => {
      votes[option] = 0;
    });

    const safeDuration = typeof durationMinutes === 'number' && durationMinutes > 0 ? durationMinutes : 3;
    const order = this.buildOrder(options.length);

    await this.setDocFn(roomRef, {
      name,
      code,
      createdBy,
      status: 'waiting',
      options,
      order,
      currentIndex: 0,
      preScores: {},
      finalVotes: {},
      votes,
      totalVotes: 0,
      durationMinutes: safeDuration,
      createdAt: this.nowFn()
    });

  }

  getRooms(): Observable<any[]> {
    const roomsRef = this.collectionFn(this.firestore, 'rooms');
    return this.collectionDataFn(roomsRef, { idField: 'id' }) as Observable<any[]>;
  }

  async startVoting(code: string) {
    const roomRef = this.docFn(this.firestore, `rooms/${code}`);
    const snapshot = await this.getDocFn(roomRef);
    if (!snapshot.exists()) {
      throw new Error('Room not found');
    }

    const data = snapshot.data();
    const options = Array.isArray(data['options']) ? data['options'] : [];
    const votes: Record<string, number> = {};
    options.forEach((option: string) => {
      votes[option] = 0;
    });

    const durationMinutes = typeof data['durationMinutes'] === 'number' && data['durationMinutes'] > 0
      ? data['durationMinutes']
      : 3;
    const now = this.nowFn();
    const endsAt = this.fromDateFn(new Date(now.toDate().getTime() + durationMinutes * 60 * 1000));

    return this.updateDocFn(roomRef, {
      status: 'voting',
      startedAt: now,
      endsAt,
      finalVotes: {},
      votes,
      totalVotes: 0
    });
  }

  async startReveal(code: string) {
    const roomRef = this.docFn(this.firestore, `rooms/${code}`);
    const snapshot = await this.getDocFn(roomRef);
    if (!snapshot.exists()) {
      throw new Error('Room not found');
    }

    const data = snapshot.data();
    const options = Array.isArray(data['options']) ? data['options'] : [];
    if (options.length < 2) {
      throw new Error('Not enough participants');
    }

    const order = this.normalizeOrder(options.length, data['order']);

    return this.updateDocFn(roomRef, {
      status: 'reveal',
      order,
      currentIndex: 0
    });
  }

  async nextParticipant(code: string) {
    const roomRef = this.docFn(this.firestore, `rooms/${code}`);
    const snapshot = await this.getDocFn(roomRef);
    if (!snapshot.exists()) {
      throw new Error('Room not found');
    }

    const data = snapshot.data();
    const options = Array.isArray(data['options']) ? data['options'] : [];
    const order = this.normalizeOrder(options.length, data['order']);
    const currentIndex = typeof data['currentIndex'] === 'number' ? data['currentIndex'] : 0;
    const lastIndex = Math.max(order.length - 1, 0);
    const nextIndex = Math.min(currentIndex + 1, lastIndex);

    return this.updateDocFn(roomRef, {
      order,
      currentIndex: nextIndex
    });
  }

  updateOptions(code: string, options: string[]) {
    const roomRef = this.docFn(this.firestore, `rooms/${code}`);
    const votes: Record<string, number> = {};
    options.forEach(option => {
      votes[option] = 0;
    });

    return this.updateDocFn(roomRef, {
      options,
      votes,
      totalVotes: 0
    });
  }

  updateRoomSettings(code: string, options: string[], durationMinutes: number) {
    const roomRef = this.docFn(this.firestore, `rooms/${code}`);
    const votes: Record<string, number> = {};
    options.forEach(option => {
      votes[option] = 0;
    });

    const safeDuration = typeof durationMinutes === 'number' && durationMinutes > 0 ? durationMinutes : 3;
    const order = this.buildOrder(options.length);

    return this.updateDocFn(roomRef, {
      options,
      order,
      currentIndex: 0,
      preScores: {},
      finalVotes: {},
      votes,
      totalVotes: 0,
      durationMinutes: safeDuration
    });
  }

  getRoomByCode(code: string): Observable<any> {
    const roomRef = this.docFn(this.firestore, `rooms/${code}`);
    return this.docDataFn(roomRef, { idField: 'code' }) as Observable<any>;
  }

  vote(code: string, option: string, voterId?: string) {
    const roomRef = this.docFn(this.firestore, `rooms/${code}`);
    const updates: Record<string, any> = {
      [`votes.${option}`]: this.incrementFn(1),
      totalVotes: this.incrementFn(1)
    };
    if (voterId) {
      updates[`finalVotes.${voterId}`] = option;
    }
    return this.updateDocFn(roomRef, updates);
  }

  savePreScore(code: string, voterId: string, participant: string, score: number) {
    const roomRef = this.docFn(this.firestore, `rooms/${code}`);
    const safeScore = this.clampScore(score);
    return this.updateDocFn(roomRef, {
      [`preScores.${voterId}.${participant}`]: safeScore
    });
  }

  closeVoting(code: string) {
    const roomRef = this.docFn(this.firestore, `rooms/${code}`);
    return this.updateDocFn(roomRef, { status: 'closed' });
  }

  archiveRoom(code: string) {
    const roomRef = this.docFn(this.firestore, `rooms/${code}`);
    return this.updateDocFn(roomRef, {
      status: 'archived',
      archivedAt: this.nowFn()
    });
  }

  private clampScore(score: number) {
    if (!Number.isFinite(score)) return 0;
    if (score < 0) return 0;
    if (score > 10) return 10;
    return Math.round(score);
  }

  private buildOrder(length: number) {
    const indices = Array.from({ length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.randomFn() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }

  private normalizeOrder(length: number, order: any) {
    if (Array.isArray(order) && order.length === length) {
      return order;
    }
    return this.buildOrder(length);
  }
}
