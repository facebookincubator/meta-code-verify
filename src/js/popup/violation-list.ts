/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {downloadHashSource, getRecords} from '../background/historyManager';

class ViolationList extends HTMLElement {
  connectedCallback() {
    const currentTabID = new URL(document.location.href).searchParams.get(
      'tab_id',
    )!;
    getRecords().then(records => {
      const rows = records.reverse().map(([tabID, record]) => {
        const hashesHeader = `
          <thead>
            <tr>
              <th>Hash</th>
              <th>Version</th>
              <th>Origin</th>
              <th>Download</th>
            </tr>
          </thead>
        `;

        const hashes = record.violations
          .map(v => {
            return `
              <tr>
                <td><code>${v.hash}</code></td>
                <td>${v.version}</td>
                <td>${v.origin}</td>
                <td>
                  <img
                    class="download_img"
                    data-tab-id="${tabID}"
                    data-hash="${v.hash}"
                    src="circle-download-cta.svg"/>
                </td>
              </tr>
            `;
          })
          .join('');

        const violationsTable =
          hashes.length > 0
            ? `
              <tr class="subtable_wrapper" data-expand-target="${tabID}">
                <td colspan="4">
                  <table class="hashes_table">
                    ${hashesHeader}
                    ${hashes}
                  </table>
                </td>
              </tr>

            `
            : '';

        const expandCell =
          record.violations.length > 0
            ? `
            <td
              class="expand-row"
              data-expand-src="${tabID}"
              data-violation-count="${record.violations.length}">
              &#9654; Show (${record.violations.length})
            </td>
          `
            : `
            <td>-</td>
          `;

        const currentTabClass =
          currentTabID === tabID ? ' class="current-tab"' : '';

        return `
          <tr data-tab-row-id=${tabID}${currentTabClass}>
            <td>${record.url}</td>
            <td>${new Date(record.creationTime).toLocaleString()}</td>
            <td>${tabID}</td>
            ${expandCell}
          </tr>
          ${violationsTable}
        `;
      });

      this.innerHTML = `
        <popup-header header-message="i18nViolations"></popup-header>
        <table>
          <thead>
            <th>URL</th>
            <th>Time</th>
            <th>Tab ID</th>
            <th>Violations</th>
          </thead>
          ${rows.join('')}
        </table>
      `;

      document.querySelectorAll('.download_img').forEach(img => {
        img.addEventListener('click', () => {
          const tabID = img.getAttribute('data-tab-id')!;
          const hash = img.getAttribute('data-hash')!;
          downloadHashSource(tabID, hash);
        });
      });

      document.querySelectorAll('[data-expand-src]').forEach(expand => {
        const tabID = expand.getAttribute('data-expand-src')!;
        expand.addEventListener('click', () => {
          const subtable = document.querySelector(
            `[data-expand-target="${tabID}"]`,
          )!;
          subtable.classList.toggle('expanded');
          expand.innerHTML = subtable.classList.contains('expanded')
            ? `&#9660; Hide`
            : `&#9654; Show (${expand.getAttribute('data-violation-count')})`;
        });
      });
    });
  }
}

customElements.define('violation-list', ViolationList);
