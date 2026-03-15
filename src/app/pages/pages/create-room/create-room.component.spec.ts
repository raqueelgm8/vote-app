import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CreateRoomComponent } from './create-room.component';
import { RoomService } from '../../../services/room.service';

describe('CreateRoomComponent', () => {
  let component: CreateRoomComponent;
  let fixture: ComponentFixture<CreateRoomComponent>;
  let roomService: { createRoom: jasmine.Spy; startVoting: jasmine.Spy };
  let router: { navigate: jasmine.Spy };

  beforeEach(async () => {
    roomService = {
      createRoom: jasmine.createSpy('createRoom').and.returnValue(Promise.resolve()),
      startVoting: jasmine.createSpy('startVoting').and.returnValue(Promise.resolve())
    };
    router = {
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      imports: [CreateRoomComponent],
      providers: [
        { provide: RoomService, useValue: roomService },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateRoomComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('addOption adds and prevents duplicates', () => {
    component.optionName = 'Equipo A';
    component.addOption();
    expect(component.options).toEqual(['Equipo A']);

    component.optionName = 'equipo a';
    component.addOption();
    expect(component.notice?.type).toBe('error');
    expect(component.options).toEqual(['Equipo A']);
  });

  it('clampDuration enforces minimum of 1', () => {
    component.durationMinutes = 0;
    component.clampDuration();
    expect(component.durationMinutes).toBe(1);
  });

  it('canCreateRoom depends on name and options', () => {
    component.votingName = 'Mi sala';
    component.options = ['A', 'B'];
    component.roomCode = '';
    expect(component.canCreateRoom).toBe(true);

    component.roomCode = 'CODE';
    expect(component.canCreateRoom).toBe(false);
  });

  it('createRoom validates name and options', async () => {
    component.votingName = '';
    component.options = ['A', 'B'];
    await component.createRoom();
    expect(component.notice?.type).toBe('error');
    expect(roomService.createRoom).not.toHaveBeenCalled();
  });

  it('createRoom creates and navigates', async () => {
    spyOn(component as any, 'generateCode').and.returnValue('ABC123');
    component.votingName = 'Sala';
    component.options = ['A', 'B'];
    component.durationMinutes = 3;

    await component.createRoom();

    expect(roomService.createRoom).toHaveBeenCalledWith('Sala', 'ABC123', 'admin', ['A', 'B'], 3);
    expect(component.roomCode).toBe('ABC123');
    expect(component.qrCodeValue).toContain('/join/ABC123');
    expect(router.navigate).toHaveBeenCalledWith(['/active-room'], { queryParams: { code: 'ABC123' } });
  });
});
