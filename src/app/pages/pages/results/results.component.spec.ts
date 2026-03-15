import { ComponentFixture, TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { ResultsComponent } from './results.component';
import { RoomService } from '../../../services/room.service';
import { provideRouter } from '@angular/router';

describe('ResultsComponent', () => {
  let component: ResultsComponent;
  let fixture: ComponentFixture<ResultsComponent>;
  let roomService: { getRooms: jasmine.Spy };

  beforeEach(async () => {
    roomService = {
      getRooms: jasmine.createSpy('getRooms')
    };

    await TestBed.configureTestingModule({
      imports: [ResultsComponent],
      providers: [
        { provide: RoomService, useValue: roomService },
        provideRouter([])
      ]
    })
    .compileComponents();
  });

  it('should create', () => {
    roomService.getRooms.and.returnValue(of([]));
    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('filters and sorts rooms by createdAt desc', async () => {
    const rooms = [
      { code: 'A', status: 'waiting', createdAt: new Date('2024-01-01T10:00:00Z') },
      { code: 'B', status: 'closed', createdAt: new Date('2024-03-01T10:00:00Z') },
      { code: 'C', status: 'archived', createdAt: new Date('2024-02-01T10:00:00Z') },
      { code: 'D', status: 'voting', createdAt: new Date('2024-04-01T10:00:00Z') }
    ];
    roomService.getRooms.and.returnValue(of(rooms));
    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const result = await firstValueFrom(component.rooms$);
    expect(result.map(room => room.code)).toEqual(['B', 'C']);
  });

  it('builds results with positions and percentages', () => {
    roomService.getRooms.and.returnValue(of([]));
    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
    const room = {
      options: ['Equipo A', 'Equipo B'],
      votes: { 'Equipo A': 2, 'Equipo B': 1 },
      totalVotes: 3
    };

    const results = component.getResults(room);

    expect(results).toEqual([
      { position: 1, name: 'Equipo A', votes: 2, percent: 67 },
      { position: 2, name: 'Equipo B', votes: 1, percent: 33 }
    ]);
  });

  it('handles missing room or options gracefully', () => {
    roomService.getRooms.and.returnValue(of([]));
    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;

    expect(component.getResults(null)).toEqual([]);
    expect(component.getResults({})).toEqual([]);
  });

  it('returns zeros when totalVotes is 0', () => {
    roomService.getRooms.and.returnValue(of([]));
    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
    const room = {
      options: ['A', 'B'],
      votes: { A: 5, B: '1' },
      totalVotes: 0
    };

    const results = component.getResults(room);

    expect(results[0].percent).toBe(0);
    expect(results[1].percent).toBe(0);
  });

  it('uses empty votes object when votes is missing', () => {
    roomService.getRooms.and.returnValue(of([]));
    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
    const room = {
      options: ['A', 'B'],
      totalVotes: 0
    };

    const results = component.getResults(room);

    expect(results[0].votes).toBe(0);
    expect(results[1].votes).toBe(0);
  });

  it('defaults totalVotes when missing and handles null votes', () => {
    roomService.getRooms.and.returnValue(of([]));
    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
    const room = {
      options: ['A'],
      votes: null
    };

    const results = component.getResults(room);

    expect(results[0].percent).toBe(0);
    expect(results[0].votes).toBe(0);
  });

  it('handles missing votes with totalVotes set', () => {
    roomService.getRooms.and.returnValue(of([]));
    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
    const room = {
      options: ['A'],
      totalVotes: 10
    };

    const results = component.getResults(room);

    expect(results[0].votes).toBe(0);
    expect(results[0].percent).toBe(0);
  });

  it('treats non-numeric votes as 0', () => {
    roomService.getRooms.and.returnValue(of([]));
    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
    const room = {
      options: ['A', 'B'],
      votes: { A: 'x', B: 2 },
      totalVotes: 2
    };

    const results = component.getResults(room);

    expect(results[0].name).toBe('B');
    expect(results[0].votes).toBe(2);
    expect(results[1].name).toBe('A');
    expect(results[1].votes).toBe(0);
  });

  it('returns "Sin votos" when there are no options', () => {
    roomService.getRooms.and.returnValue(of([]));
    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
    const room = { options: [], votes: {}, totalVotes: 0 };
    expect(component.getWinner(room)).toBe('Sin votos');
  });

  it('returns winner name when there are votes', () => {
    roomService.getRooms.and.returnValue(of([]));
    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
    const room = {
      options: ['A', 'B'],
      votes: { A: 3, B: 1 },
      totalVotes: 4
    };
    expect(component.getWinner(room)).toBe('A');
  });

  it('trackByCode returns room code', () => {
    roomService.getRooms.and.returnValue(of([]));
    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
    expect(component.trackByCode(0, { code: 'XYZ' })).toBe('XYZ');
    expect(component.trackByCode(0, null as any)).toBeUndefined();
  });

  it('toggles expanded state by code', () => {
    roomService.getRooms.and.returnValue(of([]));
    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
    const code = 'ABC123';
    expect(component.isExpanded(code)).toBe(false);
    component.toggleRoom(code);
    expect(component.isExpanded(code)).toBe(true);
    component.toggleRoom(code);
    expect(component.isExpanded(code)).toBe(false);
  });

  it('sorts with mixed createdAt types', async () => {
    const rooms = [
      { code: 'A', status: 'closed', createdAt: { toDate: () => new Date('2024-05-01T10:00:00Z') } },
      { code: 'B', status: 'closed', createdAt: 1714562400000 },
      { code: 'C', status: 'archived', createdAt: 'invalid' },
      { code: 'D', status: 'archived', createdAt: null }
    ];
    roomService.getRooms.and.returnValue(of(rooms));
    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const result = await firstValueFrom(component.rooms$);
    expect(result.map(room => room.code)).toEqual(['B', 'A', 'C', 'D']);
  });

  it('toMillis handles null, toDate, valid and invalid values', () => {
    roomService.getRooms.and.returnValue(of([]));
    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
    const toMillis = (component as any).toMillis.bind(component);

    expect(toMillis(null)).toBe(0);
    expect(toMillis({ toDate: () => new Date('2024-01-01T00:00:00Z') })).toBe(1704067200000);
    expect(toMillis('invalid')).toBe(0);
    expect(toMillis(1714562400000)).toBe(1714562400000);
  });
});
