import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma, LinkStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import type { LinkOwner } from '../links/links.service.js';
import { LinkResponseDto } from '../links/dto/link-response.dto.js';
import { ClickStatsDto } from './dto/click-stats.dto.js';

/** Metadata extracted from the HTTP request for a click record. */
export interface ClickMeta {
  ip: string | undefined;
  userAgent: string | undefined;
  referrer: string | undefined;
}

@Injectable()
export class ClicksService {
  private readonly logger = new Logger(ClicksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a click. IP addresses are hashed before persistence.
   */
  async record(linkId: number, meta: ClickMeta): Promise<void> {
    const ipHash = meta.ip
      ? createHash('sha256').update(meta.ip).digest('hex')
      : null;

    const userAgent = meta.userAgent?.slice(0, 512) ?? null;
    const referrer = meta.referrer?.slice(0, 2048) ?? null;

    await this.prisma.click.create({
      data: {
        linkId,
        ipHash,
        userAgent,
        referrer,
      },
    });
  }

  /**
   * Returns click statistics for a link owned by the requester.
   */
  async getStats(code: string, owner: LinkOwner): Promise<ClickStatsDto> {
    const link = await this.prisma.link.findUnique({
      where: { slug: code },
    });

    if (!link || link.status === LinkStatus.DELETED) {
      throw new NotFoundException('Link not found');
    }

    if ('userId' in owner) {
      if (link.ownerUserId !== owner.userId) {
        throw new NotFoundException('Link not found');
      }
    } else if (
      link.ownerUserId !== null ||
      link.ownerAnonId !== owner.anonId
    ) {
      throw new NotFoundException('Link not found');
    }

    const totalResult = await this.prisma.click.aggregate({
      where: { linkId: link.id },
      _count: { id: true },
    });

    const dailyRows = await this.prisma.$queryRaw<
      Array<{ day: Date; count: bigint }>
    >`
      SELECT
        DATE_TRUNC('day', clicked_at AT TIME ZONE 'UTC') AS day,
        COUNT(*)::bigint AS count
      FROM clicks
      WHERE link_id = ${link.id}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    const dailyClicks = dailyRows.map((row) => ({
      day: row.day.toISOString().slice(0, 10),
      count: Number(row.count),
    }));

    const dto = new ClickStatsDto();
    dto.code = link.slug;
    dto.total = totalResult._count.id;
    dto.dailyClicks = dailyClicks;

    return dto;
  }

  /**
   * Returns the top links belonging to the requester.
   */
  async getTopLinks(
    owner: LinkOwner,
    limit = 10,
  ): Promise<LinkResponseDto[]> {
    const ownerCondition =
      'userId' in owner
        ? Prisma.sql`l.owner_user_id = ${owner.userId}`
        : Prisma.sql`l.owner_anon_id = ${owner.anonId}`;

    const rows = await this.prisma.$queryRaw<
      Array<{ link_id: number; click_count: bigint }>
    >`
      SELECT
        l.id AS link_id,
        COUNT(c.id)::bigint AS click_count
      FROM links l
      LEFT JOIN clicks c ON c.link_id = l.id
      WHERE
        ${ownerCondition}
        AND l.status != ${LinkStatus.DELETED}::"link_status"
      GROUP BY l.id
      ORDER BY click_count DESC
      LIMIT ${limit}
    `;

    if (rows.length === 0) {
      return [];
    }

    const linkIds = rows.map((row) => row.link_id);

    const links = await this.prisma.link.findMany({
      where: { id: { in: linkIds } },
    });

    const orderMap = new Map(
      rows.map((row, index) => [row.link_id, index]),
    );

    links.sort(
      (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
    );

    return links.map((link) => LinkResponseDto.from(link));
  }
}
