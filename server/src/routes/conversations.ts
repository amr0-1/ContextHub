import { Router, type Request, type Response } from 'express';
import {
  createConversation,
  getConversations,
  getConversationById,
  updateConversationTitle,
  deleteConversation,
} from '../repositories/conversations.js';
import {
  saveMessage,
  getConversationMessages,
} from '../repositories/messages.js';

const router = Router();

/* ------------------------------------------------------------------ */
/*  GET /api/conversations — list all conversations                    */
/* ------------------------------------------------------------------ */
router.get('/', (_req: Request, res: Response) => {
  const conversations = getConversations();
  res.json(conversations);
});

/* ------------------------------------------------------------------ */
/*  POST /api/conversations — create a new conversation                */
/* ------------------------------------------------------------------ */
router.post('/', (req: Request, res: Response) => {
  const { modelId } = req.body as { modelId?: string };
  if (!modelId || typeof modelId !== 'string') {
    res.status(400).json({ error: 'modelId is required' });
    return;
  }
  const conversation = createConversation(modelId);
  res.status(201).json(conversation);
});

/* ------------------------------------------------------------------ */
/*  GET /api/conversations/:id — get a single conversation             */
/* ------------------------------------------------------------------ */
router.get('/:id', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const conversation = getConversationById(id);
  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  res.json(conversation);
});

/* ------------------------------------------------------------------ */
/*  PATCH /api/conversations/:id — update conversation title           */
/* ------------------------------------------------------------------ */
router.patch('/:id', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { title } = req.body as { title?: string };
  if (!title || typeof title !== 'string') {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  const existing = getConversationById(id);
  if (!existing) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  updateConversationTitle(id, title);
  res.json({ ...existing, title, updated_at: Date.now() });
});

/* ------------------------------------------------------------------ */
/*  DELETE /api/conversations/:id — delete a conversation              */
/* ------------------------------------------------------------------ */
router.delete('/:id', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const deleted = deleteConversation(id);
  if (!deleted) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  res.status(204).end();
});

/* ------------------------------------------------------------------ */
/*  GET /api/conversations/:id/messages — get messages                 */
/* ------------------------------------------------------------------ */
router.get('/:id/messages', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const conversation = getConversationById(id);
  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  const messages = getConversationMessages(id);
  res.json(messages);
});

/* ------------------------------------------------------------------ */
/*  POST /api/conversations/:id/messages — save a message              */
/* ------------------------------------------------------------------ */
router.post('/:id/messages', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const conversation = getConversationById(id);
  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  const { role, content, tokenUsage } = req.body as {
    role?: string;
    content?: string;
    tokenUsage?: { promptTokens?: number; completionTokens?: number };
  };

  if (!role || !content || typeof role !== 'string' || typeof content !== 'string') {
    res.status(400).json({ error: 'role and content are required' });
    return;
  }

  if (!['user', 'assistant', 'system'].includes(role)) {
    res.status(400).json({ error: 'role must be user, assistant, or system' });
    return;
  }

  const message = saveMessage(
    id,
    { role: role as 'user' | 'assistant' | 'system', content },
    tokenUsage
      ? {
          promptTokens: tokenUsage.promptTokens ?? 0,
          completionTokens: tokenUsage.completionTokens ?? 0,
        }
      : undefined,
  );

  res.status(201).json(message);
});

export default router;
