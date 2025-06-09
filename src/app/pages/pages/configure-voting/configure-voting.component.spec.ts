import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigureVotingComponent } from './configure-voting.component';

describe('ConfigureVotingComponent', () => {
  let component: ConfigureVotingComponent;
  let fixture: ComponentFixture<ConfigureVotingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigureVotingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfigureVotingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
