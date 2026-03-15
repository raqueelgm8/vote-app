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

  it('returns "Sin votos" when there are no options', () => {
    roomService.getRooms.and.returnValue(of([]));
    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
    const room = { options: [], votes: {}, totalVotes: 0 };
    expect(component.getWinner(room)).toBe('Sin votos');
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
});
