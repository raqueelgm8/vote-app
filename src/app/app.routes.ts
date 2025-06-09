import { Routes } from '@angular/router';
import { HomeComponent } from './pages/pages/home/home.component';
import { CreateRoomComponent } from './pages/pages/create-room/create-room.component';
import { ActiveRoomComponent } from './pages/pages/active-room/active-room.component';
import { ConfigureVotingComponent } from './pages/pages/configure-voting/configure-voting.component';
import { ResultsComponent } from './pages/pages/results/results.component';


export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'create-room', component: CreateRoomComponent },
  { path: 'active-room', component: ActiveRoomComponent },
  { path: 'configure-voting', component: ConfigureVotingComponent },
  { path: 'results', component: ResultsComponent }
];
