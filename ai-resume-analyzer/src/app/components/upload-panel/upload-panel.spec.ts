import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadPanel } from './upload-panel';

describe('UploadPanel', () => {
  let component: UploadPanel;
  let fixture: ComponentFixture<UploadPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(UploadPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
