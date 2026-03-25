import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { RoomService } from '../../../services/room.service';

type VoteResult = {
  position: number;
  name: string;
  votes: number;
  percent: number;
};

type ScoreRow = {
  name: string;
  score: number | null;
};

@Component({
  selector: 'app-vote',
  imports: [CommonModule],
  templateUrl: './vote.html',
  styleUrl: './vote.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Vote implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private roomService = inject(RoomService);
  private cdr = inject(ChangeDetectorRef);

  roomCode = '';
  room: any;
  loading = true;
  timeLeft = '';
  hasVoted = false;
  selectedOption = '';
  voterId = '';
  scoreScale = Array.from({ length: 10 }, (_, i) => i + 1);
  notice: { type: 'error' | 'success' | 'info'; text: string } | null = null;
  @ViewChild('noticeEl') noticeEl?: ElementRef<HTMLElement>;
  private timerId: number | undefined;
  private roomSub: any;
  private noticeTimeoutId: number | undefined;

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.roomCode = params['code'] || '';
      if (!this.roomCode) {
        this.loading = false;
        this.cdr.markForCheck();
        return;
      }

      this.ensureVoterId();

      if (this.roomSub) {
        this.roomSub.unsubscribe();
      }

      this.roomSub = this.roomService.getRoomByCode(this.roomCode).subscribe(room => {
        this.room = room;
        this.loading = false;
        this.ensureVoterId();
        this.updateVoteState();
        this.updateTimer();
        this.cdr.markForCheck();
      });
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

  vote(option: string) {
    if (!this.room || this.room.status !== 'voting') return;
    if (this.hasVoted) {
      this.setNotice('info', 'Ya has votado en esta sala.');
      return;
    }

    const voterId = this.ensureVoterId();

    this.roomService.vote(this.roomCode, option, voterId)
      .then(() => {
        this.hasVoted = true;
        this.selectedOption = option;
        localStorage.setItem(this.finalVoteKey(), option);
        this.setNotice('success', 'Voto registrado. ¡Gracias!');
        this.cdr.markForCheck();
      })
      .catch(error => {
        console.error(error);
        this.setNotice('error', 'No se pudo registrar tu voto.');
      });
  }

  scoreParticipant(score: number) {
    if (!this.room || this.room.status !== 'reveal') return;
    const participant = this.currentParticipantName;
    if (!participant) return;

    const voterId = this.ensureVoterId();

    this.roomService.savePreScore(this.roomCode, voterId, participant, score)
      .catch(error => {
        console.error(error);
        this.setNotice('error', 'No se pudo guardar la puntuación.');
      });
  }

  get currentParticipantName(): string {
    if (!this.room || !Array.isArray(this.room.options)) return '';
    const order = Array.isArray(this.room.order) ? this.room.order : [];
    const index = typeof this.room.currentIndex === 'number' ? this.room.currentIndex : 0;
    const orderIndex = order[index] ?? index;
    return this.room.options[orderIndex] ?? '';
  }

  get revealProgress() {
    if (!this.room || !Array.isArray(this.room.options)) {
      return { current: 0, total: 0 };
    }
    const total = Array.isArray(this.room.order) ? this.room.order.length : this.room.options.length;
    const index = typeof this.room.currentIndex === 'number' ? this.room.currentIndex : 0;
    return {
      current: Math.min(index + 1, total),
      total
    };
  }

  get myScores(): Record<string, number> {
    const scores = this.room?.preScores?.[this.voterId];
    if (scores && typeof scores === 'object') {
      return scores;
    }
    return {};
  }

  get currentScore(): number | null {
    const participant = this.currentParticipantName;
    if (!participant) return null;
    const score = this.myScores[participant];
    return typeof score === 'number' ? score : null;
  }

  get myScoresList(): ScoreRow[] {
    if (!this.room || !Array.isArray(this.room.options)) return [];
    return this.room.options.map((name: string) => ({
      name,
      score: typeof this.myScores[name] === 'number' ? this.myScores[name] : null
    }));
  }

  get results(): VoteResult[] {
    if (!this.room || !Array.isArray(this.room.options)) return [];
    const votes = this.room.votes || {};
    const totalVotes = this.room.totalVotes || 0;

    return this.room.options
      .map((option: string) => {
        const count = typeof votes[option] === 'number' ? votes[option] : 0;
        const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        return { name: option, votes: count, percent };
      })
      .sort((a: VoteResult, b: VoteResult) => b.votes - a.votes)
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

  private updateVoteState() {
    if (!this.roomCode) return;
    const finalVote = this.room?.finalVotes?.[this.voterId];
    const storedVote = localStorage.getItem(this.finalVoteKey());
    const selected = finalVote || storedVote || '';
    this.hasVoted = !!selected;
    this.selectedOption = selected;
    if (finalVote && finalVote !== storedVote) {
      localStorage.setItem(this.finalVoteKey(), finalVote);
    }
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

  private ensureVoterId(): string {
    if (!this.roomCode) return '';
    const key = this.voterKey();
    const stored = localStorage.getItem(key);
    if (stored) {
      this.voterId = stored;
      return stored;
    }
    const newId = `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(key, newId);
    this.voterId = newId;
    return newId;
  }

  private voterKey() {
    return `voter:${this.roomCode}`;
  }

  private finalVoteKey() {
    return `vote:${this.roomCode}`;
  }

  private setNotice(type: 'error' | 'success' | 'info', text: string) {
    this.notice = { type, text };
    this.cdr.markForCheck();
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
}
