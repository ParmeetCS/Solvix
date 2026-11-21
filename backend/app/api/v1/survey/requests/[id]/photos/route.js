import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSurveyAccess, logSurveyActivity } from '@/lib/supabase/surveyAuth';
import { surveyStore } from '@/lib/survey/surveyStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/survey/requests/[id]/photos
 * Lists photographs and documents attached to this survey.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const authResult = await requireSurveyAccess(request, { targetSurveyId: id });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;

    if (adminClient) {
      try {
        const { data: photos, error } = await adminClient
          .from('survey_photos')
          .select('*')
          .eq('survey_id', id)
          .order('uploaded_at', { ascending: false });

        if (!error && photos) {
          return jsonResponse({ photos });
        }
      } catch (e) {
        // Fall back
      }
    }

    const surveyData = await surveyStore.getSurveyById(id);
    return jsonResponse({ photos: surveyData?.photos || [] });
  } catch (error) {
    return jsonError('Failed to fetch survey photos: ' + error.message, 500);
  }
}

/**
 * POST /api/v1/survey/requests/[id]/photos
 * Uploads/registers a photograph or document.
 * Validates file size (<= 10MB) and allowed MIME types.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const authResult = await requireSurveyAccess(request, { targetSurveyId: id });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const body = await request.json();

    const {
      file_name,
      file_size_bytes = 1048576,
      file_type = 'image/jpeg',
      photo_type = 'site',
      caption,
      description,
      storage_path,
      signed_url
    } = body;

    // Validate size (max 10MB = 10 * 1024 * 1024)
    if (file_size_bytes > 10 * 1024 * 1024) {
      return jsonError('File size exceeds the 10 MB limit.', 400);
    }

    // Validate mime types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (file_type && !allowedTypes.includes(file_type.toLowerCase())) {
      return jsonError('Invalid file type. Allowed: JPG, PNG, WEBP, PDF.', 400);
    }

    let photo;

    if (adminClient) {
      try {
        const finalPath = storage_path || `survey-attachments/${id}/${Date.now()}_${file_name || 'upload.jpg'}`;
        const { data, error } = await adminClient
          .from('survey_photos')
          .insert({
            survey_id: id,
            storage_path: finalPath,
            photo_type: ['roof', 'electrical', 'site', 'shading', 'other'].includes(photo_type) ? photo_type : 'other',
            caption: caption || file_name,
            uploaded_by: profile.id
          })
          .select('*')
          .single();

        if (!error && data) {
          photo = data;
        }
      } catch (e) {
        // Fall back
      }
    }

    if (!photo) {
      photo = await surveyStore.addPhoto(id, {
        file_name,
        file_size_bytes,
        file_type,
        photo_type,
        caption,
        description,
        storage_path,
        signed_url
      }, profile);
    }

    await logSurveyActivity({
      actorId: profile.id,
      action: 'PHOTO_UPLOADED',
      surveyId: id,
      metadata: { photo_id: photo.id, photo_type, file_name }
    });

    return jsonResponse(photo, { message: 'Photograph attached to site survey successfully.' });
  } catch (error) {
    return jsonError('Failed to upload survey photograph: ' + error.message, 500);
  }
}
