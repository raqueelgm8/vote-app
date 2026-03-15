import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { map } from 'rxjs';
import { RoomService } from '../../../services/room.service';

@Component({
  selector: 'app-results',
  imports: [CommonModule, RouterModule],
  templateUrl: './results.component.html',
  styleUrl: './results.component.scss'
})
export class ResultsComponent {

  private roomService = inject(RoomService);

  rooms$ = this.roomService.getRooms().pipe(
    map(rooms =>
      rooms
        .filter(room => room.status === 'closed' || room.status === 'archived')
        .sort((a, b) => this.toMillis(b?.createdAt) - this.toMillis(a?.createdAt))
    )
  );

  getResults(room: any) {
    if (!room || !Array.isArray(room.options)) return [];
    const votes = room.votes || {};
    const totalVotes = room.totalVotes || 0;

    return room.options
      .map((option: string) => {
        const count = typeof votes[option] === 'number' ? votes[option] : 0;
        const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        return { name: option, votes: count, percent };
      })
      .sort((a: { votes: number }, b: { votes: number }) => b.votes - a.votes)
      .map((item: { name: string; votes: number; percent: number }, index: number) => ({
        position: index + 1,
        ...item
      }));
  }

  getWinner(room: any) {
    const results = this.getResults(room);
    if (!results.length) return 'Sin votos';
    return results[0].name;
  }

  trackByCode(_: number, room: any) {
    return room?.code;
  }

  private toMillis(value: any) {
    if (!value) return 0;
    if (value?.toDate) return value.toDate().getTime();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }
}
