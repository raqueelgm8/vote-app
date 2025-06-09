import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiveRoomComponent } from './active-room.component';

describe('ActiveRoomComponent', () => {
  let component: ActiveRoomComponent;
  let fixture: ComponentFixture<ActiveRoomComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveRoomComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActiveRoomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
