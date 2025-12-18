'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Presentation, Question } from '@/types';
import { getPresentationById, savePresentation } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import QuestionList from '@/components/QuestionList';
import Link from 'next/link';

export default function PresentationEditor() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === 'new';

  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    loadPresentation();
  }, [id, isNew, session, status, router]);

  const loadPresentation = async () => {
    try {
      setLoading(true);
      if (isNew) {
        setPresentation({
          id: 'new',
          userId: session?.user?.id || '',
          title: '',
          description: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          questions: [],
        });
        setTitle('');
        setDescription('');
      } else {
        const loaded = await getPresentationById(id);
        if (loaded) {
          setPresentation(loaded);
          setTitle(loaded.title);
          setDescription(loaded.description || '');
        } else {
          router.push('/');
        }
      }
    } catch (err: any) {
      console.error('Error loading presentation:', err);
      if (err.message?.includes('Unauthorized')) {
        router.push('/auth/signin');
      } else {
        router.push('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!presentation) return;
    if (!title.trim()) {
      alert('Title is required');
      return;
    }

    try {
      setSaving(true);
      const updated: Presentation = {
        ...presentation,
        title: title.trim(),
        description: description.trim(),
        updatedAt: new Date().toISOString(),
      };

      const saved = await savePresentation(updated);
      setPresentation(saved);
      
      if (isNew) {
        router.push(`/presentations/${saved.id}`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save presentation');
    } finally {
      setSaving(false);
    }
  };

  const handleQuestionUpdate = async (question: Question) => {
    if (!presentation) return;
    try {
      const updated: Presentation = {
        ...presentation,
        questions: presentation.questions.map(q => q.id === question.id ? question : q),
        updatedAt: new Date().toISOString(),
      };
      const saved = await savePresentation(updated);
      setPresentation(saved);
    } catch (err: any) {
      alert(err.message || 'Failed to update question');
    }
  };

  const handleQuestionAdd = async (question: Question) => {
    if (!presentation) return;
    try {
      const newQuestion: Question = {
        ...question,
        id: generateId(),
      };
      const updated: Presentation = {
        ...presentation,
        questions: [...presentation.questions, newQuestion],
        updatedAt: new Date().toISOString(),
      };
      const saved = await savePresentation(updated);
      setPresentation(saved);
    } catch (err: any) {
      alert(err.message || 'Failed to add question');
    }
  };

  const handleQuestionDelete = async (questionId: string) => {
    if (!presentation) return;
    try {
      const updated: Presentation = {
        ...presentation,
        questions: presentation.questions.filter(q => q.id !== questionId),
        updatedAt: new Date().toISOString(),
      };
      const saved = await savePresentation(updated);
      setPresentation(saved);
    } catch (err: any) {
      alert(err.message || 'Failed to delete question');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!session || !presentation) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Presentation Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-lg"
              placeholder="Enter presentation title..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              rows={3}
              placeholder="Enter a description (optional)..."
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Presentation'}
          </button>
        </div>

        <QuestionList
          questions={presentation.questions}
          onUpdate={handleQuestionUpdate}
          onAdd={handleQuestionAdd}
          onDelete={handleQuestionDelete}
        />
      </div>
    </div>
  );
}
