/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Return text from the response object. The main purpose of this method is to
 * extract and parse sourceURL and sourceMappingURL comments from inlined data
 * scripts.
 * Note that this function consumes the response body!
 *
 * @param {Response} response Response will be consumed!
 * @returns string Response text if the sourceURL is valid
 */
export default async function genSourceText(
  response: Response,
): Promise<string> {
  const sourceText = await response.text();
  // Just a normal script tag with a source url
  if (!response.url.startsWith('data:application/x-javascript')) {
    return sourceText;
  }

  // Inlined data-script. We need to extract with optional `//# sourceURL=` and
  // `//# sourceMappingURL=` comments before sending it over to be hashed...
  const sourceTextParts = sourceText.trimEnd().split('\n');

  // NOTE: For security reasons, we expect inlined data scripts to *end* with
  // sourceURL comments. This is because a man-in-the-middle can insert code
  // after the sourceURL comment, which would execute on the browser but get
  // stripped away by the extension before getting hashed + verified.
  // As a result, we're always starting our search from the bottom.
  if (
    sourceTextParts[sourceTextParts.length - 1].startsWith('//# sourceURL=')
  ) {
    // Assume we always have a final part.
    const finalpart = sourceTextParts.pop()!;
    const sourceURL = finalpart.split('//# sourceURL=')[1] ?? '';
    if (!sourceURL.startsWith('http')) {
      throw new Error(`Invalid sourceUrl in inlined data script: ${sourceURL}`);
    }
  }
  while (
    sourceTextParts[sourceTextParts.length - 1] === '\n' ||
    sourceTextParts[sourceTextParts.length - 1].startsWith(
      '//# sourceMappingURL=',
    )
  ) {
    sourceTextParts.pop();
  }
  return sourceTextParts.join('\n').trim();
}
