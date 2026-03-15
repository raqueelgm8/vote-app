import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QRCodeComponent } from 'angularx-qrcode';
import { RoomService } from '../../../services/room.service';

@Component({
  selector: 'app-create-room',
  imports: [CommonModule, QRCodeComponent, FormsModule],
  templateUrl: './create-room.component.html',
  styleUrl: './create-room.component.scss'
})
export class CreateRoomComponent {

  private roomService = inject(RoomService);
  votingName = '';
  roomCode = '';
  qrCodeValue = '';

  async createRoom() {

    if (!this.votingName.trim()) {
      alert('Please enter a voting name.');
      return;
    }

    try {

      this.roomCode = this.generateCode(6);

      this.qrCodeValue = `${window.location.origin}/join/${this.roomCode}`;

      await this.roomService.createRoom(
        this.votingName,
        this.roomCode,
        'admin'
      );

    } catch (error) {

      alert('Error creando la sala');
      console.error(error);

    }

  }



  startVoting() {
    if (!this.roomCode) {
      alert('Primero crea una sala');
      return;
    }

    alert(`Votación "${this.votingName}" iniciada en sala: ${this.roomCode}`);
    // Aquí agregas la lógica para iniciar la votación (Firebase, etc)
  }

  private generateCode(length: number) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

}
