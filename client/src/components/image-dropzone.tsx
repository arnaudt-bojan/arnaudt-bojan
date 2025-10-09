import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface ImageDropzoneProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  maxFiles?: number;
  mode?: 'single' | 'multiple';
  className?: string;
}

export function ImageDropzone({
  value,
  onChange,
  maxFiles = 10,
  mode = 'multiple',
  className,
}: ImageDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const images = Array.isArray(value) ? value : value ? [value] : [];
  const isSingle = mode === 'single';

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of acceptedFiles) {
        // Get presigned upload URL
        const uploadResponse = await apiRequest('POST', '/api/objects/upload');
        const uploadData = await uploadResponse.json() as { uploadURL: string };
        const { uploadURL } = uploadData;

        // Upload to object storage
        const putResponse = await fetch(uploadURL, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!putResponse.ok) {
          throw new Error('Upload failed');
        }

        // Normalize the path and set ACL policy
        const normalizeResponse = await apiRequest('PUT', '/api/product-images', {
          imageURL: uploadURL,
        });
        const normalizeData = await normalizeResponse.json() as { objectPath: string };

        // Prepend /objects/ prefix to create fetchable URL
        const imageUrl = `/objects/${normalizeData.objectPath.replace(/^\/+/, '')}`;
        uploadedUrls.push(imageUrl);
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      }

      // Update images
      if (isSingle) {
        onChange(uploadedUrls[0]);
      } else {
        const newImages = [...images, ...uploadedUrls].slice(0, maxFiles);
        onChange(newImages);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  }, [images, isSingle, maxFiles, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: isSingle ? 1 : maxFiles - images.length,
    disabled: uploading || (isSingle && images.length > 0),
  });

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    if (isSingle) {
      onChange('');
    } else {
      onChange(newImages);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Image Grid */}
      {images.length > 0 && (
        <div className={cn(
          'grid gap-4',
          isSingle ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
        )}>
          {images.map((url, index) => (
            <div
              key={index}
              className="relative group aspect-square rounded-md overflow-hidden border bg-muted"
            >
              <img
                src={url}
                alt={`Upload ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`button-remove-image-${index}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropzone */}
      {(!isSingle || images.length === 0) && (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50',
            uploading && 'opacity-50 cursor-not-allowed'
          )}
          data-testid="dropzone-area"
        >
          <input {...getInputProps()} data-testid="input-file-upload" />
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            {uploading ? (
              <>
                <Upload className="w-10 h-10 text-muted-foreground animate-pulse" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </>
            ) : isDragActive ? (
              <>
                <Upload className="w-10 h-10 text-primary" />
                <p className="text-sm text-primary font-medium">Drop images here</p>
              </>
            ) : (
              <>
                <ImageIcon className="w-10 h-10 text-muted-foreground" />
                <p className="text-sm font-medium">Drag & drop images here</p>
                <p className="text-xs text-muted-foreground">
                  or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {isSingle ? '1 image' : `Up to ${maxFiles} images`} • PNG, JPG, GIF, WebP
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([filename, progress]) => (
            <div key={filename} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground truncate">{filename}</span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
