import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { LinkResponseDto } from '../links/dto/link-response.dto.js';
import { LinkStatus } from '../../generated/prisma/client.js';
import { ClickStatsDto } from './dto/click-stats.dto.js';

/** Metadata extracted from the HTTP request for a click record. */
export interface ClickMeta {
  /** Raw IP address string from the request (req.ip). May be IPv4 or IPv6. */
  ip: string | undefined;
  userAgent: string | undefined;
  referrer: string | undefined;
}

@Injectable()
export class ClicksService {
  private readonly logger = new Logger(ClicksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a click for the given link.
   *
   * The IP is hashed with SHA-256 before persistence — raw IPs are never stored.
   * This method is intentionally fire-and-forget from the caller's perspective:
   * a failure here must NOT affect the HTTP response already sent to the visitor.
   * The caller catches any thrown error and logs it without rethrowing.
   */
  async record(linkId: number, meta: ClickMeta): Promise<void> {
    const ipHash = meta.ip
      ? createHash('sha256').update(meta.ip).digest('hex')
      : null;

    // Truncate to column limits defined in the schema.
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
   * Returns aggregated click statistics for a link owned by the requester.
   *
   * Enforces ownership: throws 404 if the link does not exist, is deleted,
   * or belongs to a different anonymous owner — matching the same isolation
   * pattern used throughout LinksService.
   */
  async getStats(code: string, ownerAnonId: string): Promise<ClickStatsDto> {
    const link = await this.prisma.link.findUnique({ where: { slug: code } });

    if (!link || link.status === LinkStatus.DELETED) {
      throw new NotFoundException('Link not found');
    }

    if (link.ownerAnonId !== ownerAnonId) {
      // Return 404 rather than 403 to avoid confirming existence to other owners.
      throw new NotFoundException('Link not found');
    }

    // Total clicks — single COUNT query using the primary index on linkId.
    const totalResult = await this.prisma.click.aggregate({
      where: { linkId: link.id },
      _count: { id: true },
    });
    const total = totalResult._count.id;

    // Clicks grouped by calendar day (UTC) — uses idx_clicks_link_id_clicked_at.
    // Raw query needed because Prisma's groupBy does not support date truncation.
    const dailyRows = await this.prisma.$queryRaw<
      Array<{ day: Date; count: bigint }>
    >`
      SELECT
        DATE_TRUNC('day', clicked_at AT TIME ZONE 'UTC') AS day,
        COUNT(*)::bigint                                  AS count
      FROM clicks
      WHERE link_id = ${link.id}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    const dailyClicks = dailyRows.map((row) => ({
      day: row.day.toISOString().slice(0, 10), // 'YYYY-MM-DD'
      count: Number(row.count),
    }));

    const dto = new ClickStatsDto();
    dto.code = link.slug;
    dto.total = total;
    dto.dailyClicks = dailyClicks;
    return dto;
  }

  /**
   * Returns the top N links by click count for the given owner.
   * Used by the dashboard ranking panel.
   * Only returns ACTIVE and DISABLED links — excludes DELETED.
   */
  async getTopLinks(
    ownerAnonId: string,
    limit = 10,
  ): Promise<LinkResponseDto[]> {
    // Find links belonging to the owner ordered by their click count.
    // Uses idx_clicks_link_id_clicked_at for the JOIN/GROUP BY.
    const rows = await this.prisma.$queryRaw<
      Array<{ link_id: number; click_count: bigint }>
    >`
      SELECT
        l.id AS link_id,
        COUNT(c.id)::bigint AS click_count
      FROM links l
      LEFT JOIN clicks c ON c.link_id = l.id
      WHERE l.owner_anon_id = ${ownerAnonId}
        AND l.status != ${LinkStatus.DELETED}::"link_status"
      GROUP BY l.id
      ORDER BY click_count DESC
      LIMIT ${limit}
    `;

    if (rows.length === 0) return [];

    const linkIds = rows.map((r) => r.link_id);

    const links = await this.prisma.link.findMany({
      where: { id: { in: linkIds } },
    });

    // Preserve the click-count order from the raw query.
    const orderMap = new Map(rows.map((r, i) => [r.link_id, i]));
    links.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

    return links.map((link) => LinkResponseDto.from(link));
  }
}
