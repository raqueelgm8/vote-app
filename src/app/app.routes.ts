import { Routes } from '@angular/router';
import { HomeComponent } from './pages/pages/home/home.component';
import { CreateRoomComponent } from './pages/pages/create-room/create-room.component';
import { ResultsComponent } from './pages/pages/results/results.component';
import Vote from './pages/pages/vote/vote';
import RoomsList from './pages/pages/rooms-list/rooms-list';
import { ActiveRoom } from './pages/pages/active-room/active-room';


export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'create-room', component: CreateRoomComponent },
  { path: 'results', component: ResultsComponent },
  { path: 'join/:code', component: Vote },
  { path: 'rooms', component: RoomsList },
  { path: 'active-room', component: ActiveRoom }
];
