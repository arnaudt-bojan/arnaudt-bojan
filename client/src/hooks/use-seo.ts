import { useEffect, useRef } from "react";

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  structuredData?: object;
}

export function useSEO({
  title,
  description,
  keywords,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = "website",
  structuredData,
}: SEOProps) {
  // Track elements created by this hook and their original values
  const createdElements = useRef<Set<HTMLElement>>(new Set());
  const previousTitle = useRef<string>("");
  const previousMetaValues = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    // Save previous title
    previousTitle.current = document.title;
    
    // Set document title
    document.title = title;

    // Update or create meta tags (track what we create and save original values)
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? "property" : "name";
      const tagKey = `${attribute}:${name}`;
      let tag = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
      
      if (!tag) {
        // New tag - create and track it
        tag = document.createElement("meta");
        tag.setAttribute(attribute, name);
        document.head.appendChild(tag);
        createdElements.current.add(tag);
      } else {
        // Existing tag - save its current value before updating
        if (!previousMetaValues.current.has(tagKey)) {
          previousMetaValues.current.set(tagKey, tag.getAttribute("content") || "");
        }
      }
      
      tag.setAttribute("content", content);
    };

    // Standard meta tags
    updateMetaTag("description", description);
    if (keywords) {
      updateMetaTag("keywords", keywords);
    }

    // Open Graph tags
    updateMetaTag("og:title", ogTitle || title, true);
    updateMetaTag("og:description", ogDescription || description, true);
    updateMetaTag("og:type", ogType, true);
    if (ogImage) {
      updateMetaTag("og:image", ogImage, true);
    }

    // Twitter Card tags
    updateMetaTag("twitter:card", "summary_large_image");
    updateMetaTag("twitter:title", ogTitle || title);
    updateMetaTag("twitter:description", ogDescription || description);
    if (ogImage) {
      updateMetaTag("twitter:image", ogImage);
    }

    // Structured data (JSON-LD)
    if (structuredData) {
      let scriptTag = document.querySelector('script[type="application/ld+json"][data-seo-hook="true"]') as HTMLScriptElement;
      
      if (!scriptTag) {
        scriptTag = document.createElement("script");
        scriptTag.setAttribute("type", "application/ld+json");
        scriptTag.setAttribute("data-seo-hook", "true");
        document.head.appendChild(scriptTag);
        createdElements.current.add(scriptTag);
      }
      
      scriptTag.textContent = JSON.stringify(structuredData);
    }

    // Cleanup on unmount - restore original values and remove created elements
    return () => {
      // Restore previous title
      document.title = previousTitle.current || "Upfirst";
      
      // Restore original meta tag values for tags we modified
      previousMetaValues.current.forEach((originalValue, tagKey) => {
        const [attribute, name] = tagKey.split(":");
        const isProperty = attribute === "property";
        const tag = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
        
        if (tag) {
          if (originalValue) {
            // Restore original value
            tag.setAttribute("content", originalValue);
          } else {
            // Tag was empty before, restore that state
            tag.setAttribute("content", "");
          }
        }
      });
      
      // Remove only the elements this hook created
      createdElements.current.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
      
      // Clear refs
      createdElements.current.clear();
      previousMetaValues.current.clear();
    };
  }, [title, description, keywords, ogTitle, ogDescription, ogImage, ogType, structuredData]);
}
