/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { FolderServiceService } from './FolderService.service';

describe('Service: FolderService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FolderServiceService]
    });
  });

  it('should ...', inject([FolderServiceService], (service: FolderServiceService) => {
    expect(service).toBeTruthy();
  }));
});
