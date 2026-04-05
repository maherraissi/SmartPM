import { TestBed } from '@angular/core/testing';

import { Certification } from './certification';

describe('Certification', () => {
  let service: Certification;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Certification);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
