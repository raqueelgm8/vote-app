import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginComponent } from './pages/login/login.component';
import { MainComponent } from './pages/main/main.component';
import { AuthService } from './services/auth.service';
import { LoadingSpinnerComponent } from './pages/_components/loading-spinner/loading-spinner.component';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LoginComponent, MainComponent, LoadingSpinnerComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  user = signal<User | null>(null);
  loading = signal(true);
  isAdmin = signal(false);

  constructor(protected authService: AuthService) {
    this.authService.user$.subscribe(user => this.user.set(user));
    this.authService.isLoading$.subscribe(loading => this.loading.set(loading));
    this.authService.isAdmin$.subscribe(isAdmin => this.isAdmin.set(isAdmin));
  }
}
