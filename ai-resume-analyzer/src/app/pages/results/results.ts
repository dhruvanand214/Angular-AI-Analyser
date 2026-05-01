import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AnalysisDashboard } from '../../components/analysis-dashboard/analysis-dashboard';
import { Suggestions } from '../../components/suggestions/suggestions';
import { AnalysisStateService } from '../../services/analysis-state.service';

@Component({
  selector: 'app-results',
  imports: [AnalysisDashboard, Suggestions],
  templateUrl: './results.html',
  styleUrl: './results.css'
})
export class Results {
  constructor(
    public readonly state: AnalysisStateService,
    private readonly router: Router
  ) {}

  async retry() {
    if (this.state.mode() === 'ats') {
      await this.router.navigateByUrl('/ats-check');
      return;
    }
    await this.router.navigateByUrl('/jd-check');
  }
}

