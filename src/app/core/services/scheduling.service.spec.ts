import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SchedulingService } from './scheduling.service';

describe('SchedulingService', () => {
  let service: SchedulingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SchedulingService, provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(SchedulingService);
  });

  it('extracts structured shift conflict errors', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: {
        status: 'error',
        message: 'Shift conflicts detected.',
        errorCode: 'SHIFT_CONFLICT',
        data: {
          conflicts: [
            {
              type: 'SHIFT',
              recordId: 12,
              employeeId: 7,
              startTime: '2026-04-02T09:00:00Z',
              endTime: '2026-04-02T17:00:00Z',
              status: 'PUBLISHED',
              message: 'Overlapping shift assignment'
            }
          ]
        }
      }
    });

    const parsed = service.extractShiftConflict(error);

    expect(parsed?.errorCode).toBe('SHIFT_CONFLICT');
    expect(parsed?.data.conflicts.length).toBe(1);
    expect(parsed?.data.conflicts[0].recordId).toBe(12);
  });
});
