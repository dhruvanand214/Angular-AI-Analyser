import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Navbar } from './layout/navbar/navbar';
import { AnalysisStateService } from './services/analysis-state.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  constructor(
    private readonly router: Router,
    private readonly state: AnalysisStateService
  ) {}

  async onCheckAnother() {
    if (this.state.mode() === 'jd') {
      this.state.startAnotherCheck();
      await this.router.navigateByUrl('/jd-check');
      return;
    }
    this.state.startAnotherCheck();
    await this.router.navigateByUrl('/ats-check');
  }
}
