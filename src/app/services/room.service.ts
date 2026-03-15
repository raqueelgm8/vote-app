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

    await this.setDocFn(roomRef, {
      name,
      code,
      createdBy,
      status: 'waiting',
      options,
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
      votes,
      totalVotes: 0
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

    return this.updateDocFn(roomRef, {
      options,
      votes,
      totalVotes: 0,
      durationMinutes: safeDuration
    });
  }

  getRoomByCode(code: string): Observable<any> {
    const roomRef = this.docFn(this.firestore, `rooms/${code}`);
    return this.docDataFn(roomRef, { idField: 'code' }) as Observable<any>;
  }

  vote(code: string, option: string) {
    const roomRef = this.docFn(this.firestore, `rooms/${code}`);
    return this.updateDocFn(roomRef, {
      [`votes.${option}`]: this.incrementFn(1),
      totalVotes: this.incrementFn(1)
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
}
