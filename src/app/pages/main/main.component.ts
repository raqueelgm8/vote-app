import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { MatListModule } from '@angular/material/list';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, MatSidenavModule, MatToolbarModule, MatIconModule, MatListModule, RouterModule],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit {
  isMobile = false;
  sidenavOpened = true;
  userToggled = false;
  @ViewChild('drawer') sidenav!: MatSidenav;

  constructor(private router: Router, private authService: AuthService) { }

  ngOnInit() {
    this.checkScreen();
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreen();
  }

  checkScreen() {
    this.isMobile = window.innerWidth < 900;
    if (this.isMobile) {
      this.sidenavOpened = false;
    } else if (!this.userToggled) {
      this.sidenavOpened = true;
    }
  }

  closeSidenav() {
    if (this.isMobile) {
      this.sidenavOpened = false;
    }
  }

  toggleSidenav() {
    this.sidenavOpened = !this.sidenavOpened;
    this.userToggled = true;
  }

  logout() {
    this.authService.logout();
  }
  goTo(path: string) {
    this.router.navigate([path]);
  }
}
