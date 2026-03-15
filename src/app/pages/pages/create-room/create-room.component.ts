import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QRCodeComponent } from 'angularx-qrcode';
import { Router } from '@angular/router';
import { RoomService } from '../../../services/room.service';

@Component({
  selector: 'app-create-room',
  imports: [CommonModule, QRCodeComponent, FormsModule],
  templateUrl: './create-room.component.html',
  styleUrl: './create-room.component.scss'
})
export class CreateRoomComponent {

  private roomService = inject(RoomService);
  private router = inject(Router);
  votingName = '';
  optionName = '';
  options: string[] = [];
  roomCode = '';
  qrCodeValue = '';

  get canCreateRoom() {
    return !!this.votingName.trim() && this.options.length >= 2 && !this.roomCode;
  }

  addOption() {
    if (this.roomCode) return;

    const trimmed = this.optionName.trim();
    if (!trimmed) return;

    const exists = this.options.some(option => option.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      alert('Ese nombre ya existe.');
      return;
    }

    this.options = [...this.options, trimmed];
    this.optionName = '';
  }

  removeOption(index: number) {
    if (this.roomCode) return;
    this.options = this.options.filter((_, i) => i !== index);
  }

  async createRoom() {

    if (this.roomCode) {
      alert('La sala ya está creada.');
      return;
    }

    if (!this.votingName.trim()) {
      alert('Escribe un nombre para la votación.');
      return;
    }

    const cleanedOptions = this.options.map(option => option.trim()).filter(Boolean);
    if (cleanedOptions.length < 2) {
      alert('Agrega al menos 2 nombres para votar.');
      return;
    }

    try {

      const code = this.generateCode(6);
      const qrCode = `${window.location.origin}/join/${code}`;

      await this.roomService.createRoom(
        this.votingName.trim(),
        code,
        'admin',
        cleanedOptions
      );

      this.roomCode = code;
      this.qrCodeValue = qrCode;
      this.options = cleanedOptions;
      this.router.navigate(['/active-room'], { queryParams: { code } });

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

    this.roomService.startVoting(this.roomCode)
      .then(() => alert(`Votación iniciada en sala: ${this.roomCode}`))
      .catch(error => {
        console.error(error);
        alert('Error iniciando la votación');
      });
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
