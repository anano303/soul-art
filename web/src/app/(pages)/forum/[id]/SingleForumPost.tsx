'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import ForumPost from '../ForumPost';
import { useUser } from '@/modules/auth/hooks/use-user';
import LoadingAnim from '@/components/loadingAnim/loadingAnim';
import Link from 'next/link';
import { useLanguage } from '@/hooks/LanguageContext';

interface Forum {
  _id: string;
  content: string;
  user: {
    name: string;
    _id: string;
    role: string;
    profileImage?: string;
  };
  tags: string[];
  comments: Array<{
    _id: string;
    content: string;
    user: {
      name: string;
      _id: string;
      profileImage?: string;
    };
    createdAt: string;
    parentId?: string;
    replies?: string[];
    likes?: number;
    likesArray?: string[];
  }>;
  likes: number;
  likesArray: string[];
  image: string;
  createdAt: string;
}

interface SingleForumPostProps {
  postId: string;
}

export default function SingleForumPost({ postId }: SingleForumPostProps) {
  const { user, isLoading: isUserLoading } = useUser();
  const { t } = useLanguage();
  const router = useRouter();
  const [forum, setForum] = useState<Forum | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchForumPost = async () => {
      try {
        setIsLoading(true);
        const response = await fetchWithAuth(`/forums/${postId}`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Forum post not found');
        }

        const data = await response.json();
        setForum(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchForumPost();
  }, [postId]);

  // Add structured data for Google
  useEffect(() => {
    if (!forum) return;

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'DiscussionForumPosting',
      'headline': forum.content.substring(0, 100),
      'text': forum.content,
      'author': {
        '@type': 'Person',
        'name': forum.user.name,
      },
      'datePublished': forum.createdAt,
      'url': `https://soulart.ge/forum/${forum._id}`,
      'isPartOf': {
        '@type': 'WebSite',
        'name': 'SoulArt.ge',
        'url': 'https://soulart.ge'
      },
      'image': forum.image ? [forum.image] : [],
      'interactionStatistic': {
        '@type': 'InteractionCounter',
        'interactionType': 'https://schema.org/LikeAction',
        'userInteractionCount': forum.likes
      },
      'comment': forum.comments.map(comment => ({
        '@type': 'Comment',
        'text': comment.content,
        'author': {
          '@type': 'Person',
          'name': comment.user.name,
        },
        'dateCreated': comment.createdAt,
      }))
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);

    return () => {
      // Clean up script when component unmounts
      const existingScript = document.head.querySelector('script[type=\"application/ld+json\"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [forum]);

  if (isLoading || isUserLoading) {
    return <LoadingAnim />;
  }

  if (error || !forum) {
    return (
      <div style={{ padding: '5%', textAlign: 'center' }}>
        <h1>{t('forum.postNotFound') || 'პოსტი ვერ მოიძებნა'}</h1>
        <p>{error || 'The requested forum post could not be found.'}</p>
        <Link href="/forum" style={{ 
          color: 'var(--primary-color, #012645)',
          textDecoration: 'underline',
          fontSize: '18px'
        }}>
          {t('forum.backToForum') || '← დაბრუნება ფორუმში'}
        </Link>
      </div>
    );
  }

  const isOwner = user?._id === forum.user._id;
  const isAdmin = user?.role === 'admin';
  const canModify = isOwner || isAdmin;

  return (
    <div style={{ padding: '5%' }}>
      {/* Breadcrumb navigation */}
      <div style={{ marginBottom: '20px' }}>
        <Link href="/forum" style={{ 
          color: 'var(--primary-color, #012645)', 
          textDecoration: 'none',
          fontSize: '16px'
        }}>
          {t('forum.forum') || 'ფორუმი'} 
        </Link>
        <span style={{ margin: '0 10px', color: '#666' }}>/</span>
        <span style={{ color: '#666' }}>
          {forum.content.substring(0, 50)}...
        </span>
      </div>

      <ForumPost
        key={forum._id}
        id={forum._id}
        image={forum.image || '/avatar.jpg'}
        text={forum.content}
        category={forum.tags}
        author={{
          name: forum.user.name,
          _id: forum.user._id,
          avatar: '/avatar.jpg',
          profileImage: forum.user.profileImage || undefined,
          role: forum.user.role,
        }}
        currentUser={
          user
            ? {
                _id: user._id,
                role: user.role,
                name: user.name,
                profileImage: user.profileImage,
              }
            : undefined
        }
        comments={forum.comments.map((comment) => ({
          id: comment._id,
          text: comment.content,
          author: {
            name: comment.user.name,
            _id: comment.user._id,
            avatar: '/avatar.jpg',
            profileImage: comment.user.profileImage || undefined,
          },
          parentId: comment.parentId?.toString(),
          replies: comment.replies?.map((r) => r.toString()),
          likes: comment.likes || 0,
          likesArray: comment.likesArray || [],
        }))}
        time={new Date(forum.createdAt).toLocaleDateString()}
        likes={forum.likes}
        isLiked={forum.likesArray.includes(user?._id || '')}
        isAuthorized={!!user}
        canModify={canModify}
      />
    </div>
  );
}