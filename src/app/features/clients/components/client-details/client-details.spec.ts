import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientDetails } from './client-details';

describe('ClientDetailsComponent', () => {
  let component: ClientDetails;
  let fixture: ComponentFixture<ClientDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
