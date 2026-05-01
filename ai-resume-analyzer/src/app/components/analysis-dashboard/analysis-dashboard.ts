import { Component, Input } from '@angular/core';
import { ScoreCard } from '../score-card/score-card';
import { Suggestions } from '../suggestions/suggestions';

@Component({
  selector: 'app-analysis-dashboard',
  imports: [ScoreCard, Suggestions],
  templateUrl: './analysis-dashboard.html',
  styleUrl: './analysis-dashboard.css',
})
export class AnalysisDashboard {
  @Input() loading!: boolean;
  @Input() analysis!: any;
}
