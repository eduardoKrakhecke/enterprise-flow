import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrganizationSelectionPageComponent } from './organization-selection-page.component';

describe('OrganizationSelectionPageComponent', () => {
  let component: OrganizationSelectionPageComponent;
  let fixture: ComponentFixture<OrganizationSelectionPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationSelectionPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrganizationSelectionPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
