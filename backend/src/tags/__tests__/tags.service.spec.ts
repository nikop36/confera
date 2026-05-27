import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { TagsService } from '../tags.service';
import { TagsRepository } from '../tags.repository';

describe('TagsService', () => {
  let service: TagsService;
  const mockListAll = jest.fn();
  const mockFindBySlug = jest.fn();
  const mockCreate = jest.fn();
  const mockDeleteById = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: TagsRepository,
          useValue: {
            listAll: mockListAll,
            findBySlug: mockFindBySlug,
            create: mockCreate,
            deleteById: mockDeleteById,
          },
        },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
    jest.clearAllMocks();
  });

  describe('listTags', () => {
    it('returns all tags from the repository', async () => {
      const tags = [{ id: '1', label: 'AI', slug: 'ai', createdAt: new Date() }];
      mockListAll.mockResolvedValue(tags);
      const result = await service.listTags();
      expect(result).toEqual(tags);
    });
  });

  describe('createTag', () => {
    it('throws ConflictException when slug already exists', async () => {
      mockFindBySlug.mockResolvedValue({ id: '1', label: 'AI', slug: 'ai', createdAt: new Date() });
      await expect(service.createTag({ label: 'AI', slug: 'ai' })).rejects.toThrow(ConflictException);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('creates tag when slug is unique', async () => {
      mockFindBySlug.mockResolvedValue(null);
      mockCreate.mockResolvedValue(undefined);
      await service.createTag({ label: 'Artificial Intelligence', slug: 'ai' });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'Artificial Intelligence', slug: 'ai' }),
      );
    });
  });

  describe('deleteTag', () => {
    it('delegates to repository', async () => {
      mockDeleteById.mockResolvedValue(undefined);
      await service.deleteTag('tag-1');
      expect(mockDeleteById).toHaveBeenCalledWith('tag-1');
    });
  });
});
