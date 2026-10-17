import { LinksController } from './links.controller.js';
import { LinksService } from './links.service.js';
import { ClicksService } from '../clicks/clicks.service.js';

function makeRequest() {
  return {
    ip: '203.0.113.10',
    headers: {
      'user-agent': 'Test Browser',
      referer: 'https://example.org/page',
    },
  } as never;
}

describe('LinksController.unlockLink click analytics', () => {
  it('records a click after a successful password unlock', async () => {
    const linksService = {
      unlockLink: jest
        .fn()
        .mockResolvedValue({ url: 'https://destination.example', linkId: 42 }),
    };
    const clicksService = { record: jest.fn().mockResolvedValue(undefined) };
    const controller = new LinksController(
      linksService as unknown as LinksService,
      clicksService as unknown as ClicksService,
    );

    const result = await controller.unlockLink(
      'abc123def456',
      { password: 'correct-password' },
      makeRequest(),
    );

    expect(result.url).toBe('https://destination.example');
    expect(clicksService.record).toHaveBeenCalledWith(42, {
      ip: '203.0.113.10',
      userAgent: 'Test Browser',
      referrer: 'https://example.org/page',
    });
  });

  it('does not record a click when password unlock fails', async () => {
    const linksService = {
      unlockLink: jest.fn().mockRejectedValue(new Error('Invalid password')),
    };
    const clicksService = { record: jest.fn().mockResolvedValue(undefined) };
    const controller = new LinksController(
      linksService as unknown as LinksService,
      clicksService as unknown as ClicksService,
    );

    await expect(
      controller.unlockLink(
        'abc123def456',
        { password: 'wrong-password' },
        makeRequest(),
      ),
    ).rejects.toThrow('Invalid password');
    expect(clicksService.record).not.toHaveBeenCalled();
  });
});
