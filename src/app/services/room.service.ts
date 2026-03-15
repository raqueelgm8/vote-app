import { Injectable } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, collectionData, docData } from '@angular/fire/firestore';
import { collection, Timestamp, updateDoc, increment } from 'firebase/firestore';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RoomService {

  constructor(private firestore: Firestore) { }

  async createRoom(name: string, code: string, createdBy: string, options: string[]) {

    const roomRef = doc(this.firestore, `rooms/${code}`);

    const existingRoom = await getDoc(roomRef);

    if (existingRoom.exists()) {
      throw new Error('Room code already exists');
    }

    const votes: Record<string, number> = {};
    options.forEach(option => {
      votes[option] = 0;
    });

    await setDoc(roomRef, {
      name,
      code,
      createdBy,
      status: 'waiting',
      options,
      votes,
      totalVotes: 0,
      createdAt: Timestamp.now()
    });

  }

  getRooms(): Observable<any[]> {
    const roomsRef = collection(this.firestore, 'rooms');
    return collectionData(roomsRef, { idField: 'id' }) as Observable<any[]>;
  }

  async startVoting(code: string) {
    const roomRef = doc(this.firestore, `rooms/${code}`);
    const snapshot = await getDoc(roomRef);
    if (!snapshot.exists()) {
      throw new Error('Room not found');
    }

    const data = snapshot.data();
    const options = Array.isArray(data['options']) ? data['options'] : [];
    const votes: Record<string, number> = {};
    options.forEach((option: string) => {
      votes[option] = 0;
    });

    const now = Timestamp.now();
    const endsAt = Timestamp.fromDate(new Date(now.toDate().getTime() + 3 * 60 * 1000));

    return updateDoc(roomRef, {
      status: 'voting',
      startedAt: now,
      endsAt,
      votes,
      totalVotes: 0
    });
  }

  updateOptions(code: string, options: string[]) {
    const roomRef = doc(this.firestore, `rooms/${code}`);
    const votes: Record<string, number> = {};
    options.forEach(option => {
      votes[option] = 0;
    });

    return updateDoc(roomRef, {
      options,
      votes,
      totalVotes: 0
    });
  }

  getRoomByCode(code: string): Observable<any> {
    const roomRef = doc(this.firestore, `rooms/${code}`);
    return docData(roomRef, { idField: 'code' }) as Observable<any>;
  }

  vote(code: string, option: string) {
    const roomRef = doc(this.firestore, `rooms/${code}`);
    return updateDoc(roomRef, {
      [`votes.${option}`]: increment(1),
      totalVotes: increment(1)
    });
  }

  closeVoting(code: string) {
    const roomRef = doc(this.firestore, `rooms/${code}`);
    return updateDoc(roomRef, { status: 'closed' });
  }

  archiveRoom(code: string) {
    const roomRef = doc(this.firestore, `rooms/${code}`);
    return updateDoc(roomRef, {
      status: 'archived',
      archivedAt: Timestamp.now()
    });
  }
}
