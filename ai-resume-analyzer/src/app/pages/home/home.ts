import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AnalysisStateService } from '../../services/analysis-state.service';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  constructor(
    private readonly router: Router,
    private readonly state: AnalysisStateService
  ) {
    this.state.resetToHome();
  }

  async selectAts() {
    this.state.startAnotherCheck();
    this.state.mode.set('ats');
    await this.router.navigateByUrl('/ats-check');
  }

  async selectJd() {
    this.state.startAnotherCheck();
    this.state.mode.set('jd');
    await this.router.navigateByUrl('/jd-check');
  }

}
