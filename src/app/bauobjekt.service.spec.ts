import { TestBed } from '@angular/core/testing';

import { BauobjektService } from './bauobjekt.service';

describe('BauobjektService', () => {
  let service: BauobjektService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BauobjektService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
