import { ConflictException, Injectable } from '@nestjs/common';
import { TagsRepository } from './tags.repository';
import { CreateTagDto } from './dto/create-tag.dto';
import type { Tag } from '../common/interfaces/tag.interface';

@Injectable()
export class TagsService {
  constructor(private readonly tagsRepository: TagsRepository) {}

  async listTags(): Promise<Tag[]> {
    return this.tagsRepository.listAll();
  }

  async createTag(dto: CreateTagDto): Promise<void> {
    const existing = await this.tagsRepository.findBySlug(dto.slug);
    if (existing) {
      throw new ConflictException(`Tag with slug "${dto.slug}" already exists`);
    }
    await this.tagsRepository.create({
      label: dto.label,
      slug: dto.slug,
      createdAt: new Date(),
    });
  }

  async deleteTag(id: string): Promise<void> {
    await this.tagsRepository.deleteById(id);
  }
}
