import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { RoomService } from '../../../services/room.service';

import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-rooms-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './rooms-list.html',
  styleUrl: './rooms-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RoomsList {

  private roomService = inject(RoomService);
  private router = inject(Router);

  rooms$: Observable<any[]> = this.roomService.getRooms();

  displayedColumns: string[] = ['name', 'code', 'status', 'actions'];

  enterRoom(code: string) {
    this.router.navigate(['/active-room'], { queryParams: { code } });
  }

  archiveRoom(code: string) {
    this.roomService.archiveRoom(code)
      .catch(err => console.error(err));
  }

}
