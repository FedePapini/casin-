import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})

export class LoginComponent {
  email = '';
  password = '';
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  async login() {
    this.error = '';
    try {
      await this.auth.login(this.email, this.password);
      this.router.navigateByUrl('/');
    } catch (e: any) {
      this.error = e?.message ?? 'Errore login';
    }
  }

  async register() {
    this.error = '';
    try {
      await this.auth.register(this.email, this.password);
      this.router.navigateByUrl('/');
    } catch (e: any) {
      this.error = e?.message ?? 'Errore registrazione';
    }
  }
}
