import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import RoomsList from './rooms-list';
import { RoomService } from '../../../services/room.service';
import { MatPaginatorIntl } from '@angular/material/paginator';

describe('RoomsList', () => {
  let component: RoomsList;
  let fixture: ComponentFixture<RoomsList>;
  let roomService: { getRooms: jasmine.Spy; archiveRoom: jasmine.Spy };
  let router: { navigate: jasmine.Spy };

  beforeEach(async () => {
    roomService = {
      getRooms: jasmine.createSpy('getRooms'),
      archiveRoom: jasmine.createSpy('archiveRoom').and.returnValue(Promise.resolve())
    };
    router = {
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      imports: [RoomsList],
      providers: [
        { provide: RoomService, useValue: roomService },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RoomsList);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    roomService.getRooms.and.returnValue(of([]));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('loads rooms and paginates', () => {
    roomService.getRooms.and.returnValue(of([
      { code: 'A' }, { code: 'B' }, { code: 'C' }, { code: 'D' }, { code: 'E' }, { code: 'F' }
    ]));
    fixture.detectChanges();

    expect(component.length).toBe(6);
    expect(component.pagedRooms.length).toBe(5);
  });

  it('onPage updates pagination', () => {
    component.rooms = [{ code: 'A' }, { code: 'B' }, { code: 'C' }];
    component.onPage({ pageIndex: 0, pageSize: 2, length: 3 } as any);
    expect(component.pagedRooms.length).toBe(2);
  });

  it('enterRoom navigates with code', () => {
    component.enterRoom('ABC');
    expect(router.navigate).toHaveBeenCalledWith(['/active-room'], { queryParams: { code: 'ABC' } });
  });

  it('archiveRoom calls service', () => {
    component.archiveRoom('ABC');
    expect(roomService.archiveRoom).toHaveBeenCalledWith('ABC');
  });

  it('archiveRoom logs errors when service fails', async () => {
    const error = new Error('fail');
    roomService.archiveRoom.and.returnValue(Promise.reject(error));
    const consoleSpy = spyOn(console, 'error');

    await component.archiveRoom('ABC');

    expect(consoleSpy).toHaveBeenCalledWith(error);
  });

  it('paginator getRangeLabel handles zero length', () => {
    const intl = fixture.debugElement.injector.get(MatPaginatorIntl);
    expect(intl.getRangeLabel(0, 0, 0)).toBe('0 de 0');
  });

  it('getCreatedAt handles different inputs', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    expect(component.getCreatedAt({ createdAt: { toDate: () => date } })).toBe(date);
    expect(component.getCreatedAt({ createdAt: 1704067200000 })?.getTime()).toBe(1704067200000);
    expect(component.getCreatedAt({ createdAt: 'invalid' })).toBeNull();
    expect(component.getCreatedAt({ createdAt: null })).toBeNull();
  });
});
