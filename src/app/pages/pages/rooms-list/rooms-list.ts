import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { RoomService } from '../../../services/room.service';

import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-rooms-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule
  ],
  templateUrl: './rooms-list.html',
  styleUrl: './rooms-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: MatPaginatorIntl,
      useFactory: () => {
        const intl = new MatPaginatorIntl();
        intl.itemsPerPageLabel = 'Registros por página';
        intl.nextPageLabel = 'Siguiente';
        intl.previousPageLabel = 'Anterior';
        intl.firstPageLabel = 'Primera';
        intl.lastPageLabel = 'Última';
        intl.getRangeLabel = (page, pageSize, length) => {
          if (length === 0 || pageSize === 0) {
            return `0 de ${length}`;
          }
          const start = page * pageSize;
          const end = Math.min(start + pageSize, length);
          return `${start + 1} - ${end} de ${length}`;
        };
        return intl;
      }
    }
  ]
})
export default class RoomsList implements OnInit, OnDestroy {

  private roomService = inject(RoomService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;

  rooms: any[] = [];
  pagedRooms: any[] = [];
  length = 0;
  pageSize = 5;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 15, 20];

  displayedColumns: string[] = ['name', 'code', 'createdAt', 'status', 'actions'];

  ngOnInit(): void {
    this.sub = this.roomService.getRooms().subscribe(rooms => {
      this.rooms = rooms;
      this.length = rooms.length;
      this.pageIndex = 0;
      this.updatePagedRooms();
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  enterRoom(code: string) {
    this.router.navigate(['/active-room'], { queryParams: { code } });
  }

  archiveRoom(code: string) {
    this.roomService.archiveRoom(code)
      .catch(err => console.error(err));
  }

  onPage(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePagedRooms();
    this.cdr.markForCheck();
  }

  private updatePagedRooms() {
    const start = this.pageIndex * this.pageSize;
    this.pagedRooms = this.rooms.slice(start, start + this.pageSize);
  }

  getCreatedAt(room: any): Date | null {
    const value = room?.createdAt;
    if (!value) return null;
    if (value?.toDate) return value.toDate();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

}
