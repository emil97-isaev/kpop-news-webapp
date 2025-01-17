import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('Received request:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const body = await req.json();
    console.log('Request body:', body);

    const { action, postId, userId, text, commentId } = body;

    if (!userId) {
      console.error('No user ID provided');
      throw new Error('User ID is required')
    }

    switch (action) {
      case 'get':
        if (!postId) {
          console.error('No post ID provided');
          throw new Error('Post ID is required')
        }

        console.log('Getting comments for post:', postId);
        // Получаем комментарии для поста
        const { data: comments, error: getError } = await supabaseClient
          .from('post_comments')
          .select('*')
          .eq('post_id', postId)
          .order('created_at', { ascending: true })

        if (getError) {
          console.error('Error getting comments:', getError);
          throw getError;
        }
        console.log('Found comments:', comments);
        return new Response(
          JSON.stringify(comments),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'add':
        if (!postId || !text) {
          console.error('Missing required fields:', { postId, text });
          throw new Error('Post ID and text are required')
        }

        console.log('Adding comment:', { postId, userId, text });
        // Добавляем новый комментарий
        const { data: newComment, error: addError } = await supabaseClient
          .from('post_comments')
          .insert({
            post_id: postId,
            user_id: userId,
            text: text
          })
          .select()
          .single()

        if (addError) {
          console.error('Error adding comment:', addError);
          throw addError;
        }
        console.log('Added comment:', newComment);
        return new Response(
          JSON.stringify(newComment),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'delete':
        if (!commentId) {
          console.error('No comment ID provided');
          throw new Error('Comment ID is required')
        }

        console.log('Checking comment ownership:', { commentId, userId });
        // Проверяем, принадлежит ли комментарий пользователю
        const { data: comment, error: checkError } = await supabaseClient
          .from('post_comments')
          .select('user_id')
          .eq('id', commentId)
          .single()

        if (checkError) {
          console.error('Error checking comment ownership:', checkError);
          throw checkError;
        }
        if (comment.user_id !== userId) {
          console.error('Unauthorized delete attempt:', { commentId, userId, ownerId: comment.user_id });
          throw new Error('Not authorized to delete this comment')
        }

        console.log('Deleting comment:', commentId);
        // Удаляем комментарий
        const { error: deleteError } = await supabaseClient
          .from('post_comments')
          .delete()
          .eq('id', commentId)

        if (deleteError) {
          console.error('Error deleting comment:', deleteError);
          throw deleteError;
        }
        console.log('Comment deleted successfully');
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        console.error('Invalid action:', action);
        throw new Error('Invalid action')
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 