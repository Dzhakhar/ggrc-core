/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../lazy-render/lazy-render';
import '../cycle-task-actions/cycle-task-actions';
import './tree-item-custom-attribute';
import BaseTreeItemVM from './tree-item-base-vm';
import template from './templates/tree-item.mustache';

(function (can, GGRC) {
  'use strict';

  let viewModel = BaseTreeItemVM.extend({
    define: {
      extraClasses: {
        type: String,
        get: function () {
          let classes = [];
          let instance = this.attr('instance');

          if (instance.snapshot) {
            classes.push('snapshot');
          }

          if (instance.workflow_state) {
            classes.push('t-' + instance.workflow_state);
          }

          if (this.attr('expanded')) {
            classes.push('open-item');
          }

          return classes.join(' ');
        },
      },
      selectableSize: {
        type: Number,
        get: function () {
          let attrCount = this.attr('selectedColumns').length;
          let result = 3;

          if (attrCount < 4) {
            result = 1;
          } else if (attrCount < 7) {
            result = 2;
          }

          return result;
        },
      },
    },
    selectedColumns: [],
    mandatory: [],
    disableConfiguration: null,
    itemSelector: '.tree-item-content',
  });

  /**
   *
   */
  GGRC.Components('treeItem', {
    tag: 'tree-item',
    template: template,
    viewModel: viewModel,
    events: {
      inserted: function () {
        let viewModel = this.viewModel;
        let instance = viewModel.attr('instance');
        let resultDfd;

        viewModel.attr('$el', this.element.find('.tree-item-wrapper'));
        if (instance instanceof CMS.Models.Person) {
          resultDfd = viewModel.makeResult(instance).then(function (result) {
            viewModel.attr('result', result);
          });

          viewModel.attr('resultDfd', resultDfd);
        }
      },
    },
  });
})(window.can, window.GGRC);
