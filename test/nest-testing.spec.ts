import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'bun:test';

@Injectable()
class DependencyService {}

@Injectable()
class ConsumerService {
  constructor(public readonly dependency: DependencyService) {}
}

describe('Nest Testing + Bun', () => {
  it('resolves constructor DI via @nestjs/testing', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [DependencyService, ConsumerService],
    }).compile();

    const consumer = moduleRef.get(ConsumerService);
    expect(consumer).toBeInstanceOf(ConsumerService);
    expect(consumer.dependency).toBeInstanceOf(DependencyService);
  });
});
