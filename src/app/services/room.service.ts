import { Injectable } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, collectionData, docData } from '@angular/fire/firestore';
import { collection, Timestamp, updateDoc } from 'firebase/firestore';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RoomService {

  constructor(private firestore: Firestore) { }

  async createRoom(name: string, code: string, createdBy: string) {

    const roomRef = doc(this.firestore, `rooms/${code}`);

    const existingRoom = await getDoc(roomRef);

    if (existingRoom.exists()) {
      throw new Error('Room code already exists');
    }

    await setDoc(roomRef, {
      name,
      code,
      createdBy,
      status: 'waiting',
      createdAt: Timestamp.now()
    });

  }

  getRooms(): Observable<any[]> {
    const roomsRef = collection(this.firestore, 'rooms');
    return collectionData(roomsRef, { idField: 'id' }) as Observable<any[]>;
  }

  startVoting(code: string) {
    const roomRef = doc(this.firestore, `rooms/${code}`);
    return updateDoc(roomRef, { status: 'voting' });
  }

  getRoomByCode(code: string): Observable<any> {
    const roomRef = doc(this.firestore, `rooms/${code}`);
    return docData(roomRef, { idField: 'code' }) as Observable<any>;
  }
}
