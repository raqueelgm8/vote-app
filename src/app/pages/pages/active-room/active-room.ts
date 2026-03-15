import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { QRCodeComponent } from 'angularx-qrcode';
import { RoomService } from '../../../services/room.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-active-room',
  imports: [CommonModule, QRCodeComponent, RouterModule],
  templateUrl: './active-room.html',
  styleUrl: './active-room.css'
})
export class ActiveRoom implements OnInit {

  private roomService = inject(RoomService);
  private route = inject(ActivatedRoute);

  roomCode = '';
  qrCodeValue = '';
  room$: Observable<any> | undefined;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['code']) {
        this.roomCode = params['code'];

        // Generamos el QR para que voten en esta sala
        this.qrCodeValue = `${window.location.origin}/join/${this.roomCode}`;

        // Cargamos los datos de la sala en tiempo real
        this.room$ = this.roomService.getRoomByCode(this.roomCode);
      }
    });
  }

  startVoting() {
    if (!this.roomCode) return;
    this.roomService.startVoting(this.roomCode)
      .then(() => console.log(`Votación iniciada en sala ${this.roomCode}`))
      .catch(err => console.error(err));
  }

}
