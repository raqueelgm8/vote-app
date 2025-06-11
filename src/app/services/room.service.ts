import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  writeBatch
} from '@angular/fire/firestore';
import { Timestamp, CollectionReference, DocumentData } from 'firebase/firestore';

@Injectable({ providedIn: 'root' })
export class RoomService {
  private roomsRef: CollectionReference<DocumentData>;

  constructor(private firestore: Firestore) {
    this.roomsRef = collection(this.firestore, 'rooms');
  }

  async createRoom(name: string, code: string, createdBy: string) {
    // Step 1: Deactivate previous active room(s)
    const q = query(this.roomsRef, where('active', '==', true));
    const snapshot = await getDocs(q);

    const batch = writeBatch(this.firestore);
    snapshot.forEach((docSnap) => {
      batch.update(docSnap.ref, { active: false });
    });
    await batch.commit();

    // Step 2: Add the new room and mark it active
    const newRoom = {
      name,
      code,
      createdBy,
      active: true,
      timestamp: Timestamp.now(),
    };

    await addDoc(this.roomsRef, newRoom);
  }
}
