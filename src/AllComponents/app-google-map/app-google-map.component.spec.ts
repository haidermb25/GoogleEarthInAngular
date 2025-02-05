import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppGoogleMapComponent } from './app-google-map.component';

describe('AppGoogleMapComponent', () => {
  let component: AppGoogleMapComponent;
  let fixture: ComponentFixture<AppGoogleMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AppGoogleMapComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AppGoogleMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
