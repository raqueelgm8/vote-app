import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QRCodeComponent } from 'angularx-qrcode';
import { RoomService } from '../../../services/room.service';
import { Observable } from 'rxjs';

type RoomResult = {
  position: number;
  name: string;
  votes: number;
  percent: number;
};

@Component({
  selector: 'app-active-room',
  imports: [CommonModule, QRCodeComponent, RouterModule, FormsModule],
  templateUrl: './active-room.html',
  styleUrl: './active-room.css'
})
export class ActiveRoom implements OnInit, OnDestroy {

  private roomService = inject(RoomService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  roomCode = '';
  qrCodeValue = '';
  room$?: Observable<any>;
  room: any;
  loading = true;
  timeLeft = '';
  optionName = '';
  optionsDraft: string[] = [];
  hasPendingChanges = false;
  notice: { type: 'error' | 'success' | 'info'; text: string } | null = null;
  @ViewChild('noticeEl') noticeEl?: ElementRef<HTMLElement>;
  private timerId: number | undefined;
  private roomSub: any;
  private noticeTimeoutId: number | undefined;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['code']) {
        this.roomCode = params['code'];

        this.qrCodeValue = `${window.location.origin}/join/${this.roomCode}`;

        if (this.roomSub) {
          this.roomSub.unsubscribe();
        }

        this.room$ = this.roomService.getRoomByCode(this.roomCode);
        this.roomSub = this.room$.subscribe(room => {
          this.room = room;
          this.loading = false;
          if (!this.hasPendingChanges) {
            this.optionsDraft = Array.isArray(room?.options) ? [...room.options] : [];
          }
          this.updateTimer();
          this.cdr.markForCheck();
        });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
    if (this.noticeTimeoutId) {
      clearTimeout(this.noticeTimeoutId);
    }
    if (this.roomSub) {
      this.roomSub.unsubscribe();
    }
  }

  startVoting() {
    if (!this.roomCode) return;
    if (this.hasPendingChanges) {
      this.setNotice('info', 'Guarda los cambios antes de comenzar la votación.');
      return;
    }

    this.roomService.startVoting(this.roomCode)
      .catch(err => console.error(err));
  }

  addOption() {
    if (!this.room || this.room.status !== 'waiting') return;

    const trimmed = this.optionName.trim();
    if (!trimmed) return;

    const exists = this.optionsDraft.some(option => option.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      this.setNotice('error', 'Ese nombre ya existe.');
      return;
    }

    this.optionsDraft = [...this.optionsDraft, trimmed];
    this.optionName = '';
    this.hasPendingChanges = true;
  }

  removeOption(index: number) {
    if (!this.room || this.room.status !== 'waiting') return;
    this.optionsDraft = this.optionsDraft.filter((_, i) => i !== index);
    this.hasPendingChanges = true;
  }

  saveOptions() {
    if (!this.room || this.room.status !== 'waiting') return;
    const cleaned = this.optionsDraft.map(option => option.trim()).filter(Boolean);
    if (cleaned.length < 2) {
      this.setNotice('error', 'Agrega al menos 2 nombres para votar.');
      return;
    }

    this.roomService.updateOptions(this.roomCode, cleaned)
      .then(() => {
        this.optionsDraft = cleaned;
        this.hasPendingChanges = false;
        this.setNotice('success', 'Cambios guardados.');
        this.cdr.markForCheck();
      })
      .catch(err => {
        console.error(err);
        this.setNotice('error', 'No se pudieron guardar los cambios.');
      });
  }

  get results(): RoomResult[] {
    if (!this.room || !Array.isArray(this.room.options)) return [];
    const votes = this.room.votes || {};
    const totalVotes = this.room.totalVotes || 0;

    return this.room.options
      .map((option: string) => {
        const count = typeof votes[option] === 'number' ? votes[option] : 0;
        const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        return { name: option, votes: count, percent };
      })
      .sort((a: RoomResult, b: RoomResult) => b.votes - a.votes)
      .map((item: { name: string; votes: number; percent: number }, index: number) => ({
        position: index + 1,
        ...item
      }));
  }

  get winnerLabel(): string {
    const list = this.results;
    if (!list.length) return 'Sin votos';
    return list[0].name;
  }

  private updateTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = undefined;
    }

    if (!this.room || this.room.status !== 'voting' || !this.room.endsAt) {
      this.timeLeft = '';
      return;
    }

    this.tick();
    this.timerId = window.setInterval(() => this.tick(), 1000);
  }

  private tick() {
    if (!this.room || !this.room.endsAt) return;
    const endsAt = this.toDate(this.room.endsAt).getTime();
    const diff = endsAt - Date.now();

    if (diff <= 0) {
      this.timeLeft = '00:00';
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = undefined;
      }
      if (this.room.status !== 'closed') {
        this.roomService.closeVoting(this.roomCode).catch(console.error);
      }
      this.cdr.markForCheck();
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    this.timeLeft = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    this.cdr.markForCheck();
  }

  private toDate(value: any): Date {
    if (value?.toDate) return value.toDate();
    return new Date(value);
  }

  private setNotice(type: 'error' | 'success' | 'info', text: string) {
    this.notice = { type, text };
    setTimeout(() => {
      this.noticeEl?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
    if (this.noticeTimeoutId) {
      clearTimeout(this.noticeTimeoutId);
    }
    this.noticeTimeoutId = window.setTimeout(() => {
      this.notice = null;
      this.cdr.markForCheck();
    }, 4500);
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'waiting':
        return 'En espera';
      case 'voting':
        return 'Votación';
      case 'closed':
        return 'Cerrada';
      case 'archived':
        return 'Archivada';
      default:
        return status;
    }
  }

}
