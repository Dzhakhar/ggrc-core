/*!
    Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: swizec@reciprocitylabs.com
    Maintained By: swizec@reciprocitylabs.com
*/

can.Component.extend({
  tag: "assessment-generator-button",
  template: "{{{> /static/mustache/base_objects/generate_assessments_button.mustache}}}",
  scope: {
    audit: null
  },
  events: {
    'a click': function (el, ev) {
      var instance = GGRC.page_instance();
      if (this.scope.loading) {
        return;
      }
      GGRC.Controllers.MapperModal.launch(el, {
        object: 'Audit',
        type: 'Control',
        'join-object-id': this.scope.audit.id,
        'search-only': 'false',
        'join-mapping': 'program_controls',
        relevantTo: [{
          type: instance.program.type,
          id: instance.program.id
        }],
        template: {
          title: 'Select controls to generate assessments',
          submitButton: 'Generate Assessments',
          count: 'assessment(s) will be generated'
        },
        callback: this._generate_assessments.bind(this)
      });
    },
    _generate_assessments: function (controls) {
      var assessments_list = this.scope.audit.get_binding("related_assessments").list,
          controls_list = this.scope.audit.get_binding("program_controls").list,
          assessments_dfd = this._refresh(assessments_list),
          controls_dfd = this._refresh(controls_list),
          ignore_controls, dfd, inner_dfd = new $.Deferred().resolve();

      dfd = $.when(assessments_dfd, controls_dfd).then(function (assessments, controls){
        // Preload related controls mapping on assessment objects
        var related_controls_dfd = $.when.apply($, can.map(assessments, function(assessment) {
          return assessment.refresh_all("related_controls");
        }));
        return $.when(assessments, controls, related_controls_dfd);
      }).then(function (assessments, controls) {
        ignore_controls = _.map(assessments, function(ca) {
          var control_id = ca.control && ca.control.id,
              related_controls = ca.get_mapping('related_controls');
          if (!control_id && related_controls.length) {
            control_id = _.exists(related_controls[0], 'instance.id');
          }
          return control_id;
        });

        return $.when.apply($, can.map(controls, function(control) {
          if (_.includes(ignore_controls, control.id)) {
            return;
          }
          // We are rewriting inner_dfd to make sure _generate calls are
          // daisy chained
          inner_dfd = this._generate(control, inner_dfd);
          return  inner_dfd;
        }.bind(this)));
      }.bind(this));
      this._enter_loading_state(dfd);
      dfd.always(this._notify.bind(this));
    },

    _refresh: function (bindings) {
      var refresh_queue = new RefreshQueue();
      can.each(bindings, function(binding) {
          refresh_queue.enqueue(binding.instance);
      });
      return refresh_queue.trigger();
    },

    _generate: function (control, dfd) {
      var assessment,
          index,
          title = control.title + ' assessment for ' + this.scope.audit.title,
          data = {
            audit: this.scope.audit,
            control: control.stub(),
            context: this.scope.audit.context,
            owners: [CMS.Models.Person.findInCacheById(GGRC.current_user.id)],
            test_plan: control.test_plan
          };
      return dfd.then(function() {
        return GGRC.Models.Search.counts_for_types(title, ['Assessment']);
      }).then(function (result) {
        index = result.getCountFor('Assessment') + 1;
        data.title = title + ' ' + index;
        return new CMS.Models.Assessment(data).save();
      }.bind(this));
    },

    _notify: function() {
      this._exit_loading_state();

      var assessments = arguments,
        count = _.filter(assessments, function(assessment) {
          return  !_.isNull(assessment) && !(assessment.state && assessment.state() === "rejected");
        }).length,
        errors = _.filter(assessments, function(assessment) {
          return assessment.state && assessment.state() === "rejected";
        }).length,
        msg;

      if (errors < 1) {
        if (count === 0) {
          msg = {
            success: "Every Control already has an Assessment!"
          };
        } else {
          msg = {
            success: "<span class='user-string'>" + count + "</span> Assessments successfully created."
          };
        }
      } else {
        msg = {
          error: "An error occured when creating Assessments."
        };
      }

      $(document.body).trigger("ajax:flash", msg);
    },

    _enter_loading_state: function (deferred) {
      var $i = this.element.find("a > i"),
          icon = $i.attr("class");

      $i.attr("class", "fa fa-spinner fa-pulse");
      $(document.body).trigger("ajax:flash",
                               {warning: "Generating Assessments"});

      this.scope.icon = icon;
      this.scope.loading = true;
      GGRC.delay_leaving_page_until(deferred);
    },

    _exit_loading_state: function () {
      this.element.find("a > i")
            .attr("class", this.scope.icon);

      this.scope.loading = false;
    }
  }
});
