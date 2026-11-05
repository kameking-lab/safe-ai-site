require_relative 'asc_config'

base = { 'APP_STORE_APPLE_ID' => '6831079439', 'CM_TAG' => 'asc-anzen-v1.0.0-blatest-r01', 'SUBMIT_FOR_REVIEW' => 'false' }
raise 'Unsafe default' unless AscConfig.read(base) == { apple_id: '6831079439', version: '1.0.0', build: 'latest', submit: false }
raise 'Exact build ignored' unless AscConfig.read(base.merge('CM_TAG' => 'asc-anzen-v1.0.0-b17-r02'))[:build] == '17'
invalid = [
  { 'SUBMIT_FOR_REVIEW' => 'true' }, { 'SUBMIT_FOR_REVIEW' => 'FALSE' },
  { 'APP_STORE_APPLE_ID' => '6831078637' }, { 'ASC_APP_VERSION' => '1.0.1' },
  { 'CM_TAG' => '' }, { 'CM_TAG' => 'asc-anzen-submit-v1.0.0-b17-r01' },
  { 'CM_TAG' => 'asc-tsugino-v1.0.0-b17-r01' }, { 'CM_TAG' => 'asc-anzen-v1.0.0-b0-r01' },
  { 'CM_TAG' => 'asc-anzen-v1.0.0-b017-r01' }, { 'CM_TAG' => "asc-anzen-v1.0.0-b17-r01\n" },
  { 'CM_TAG' => 'asc-anzen-v1.0.1-b17-r01' }, { 'CM_TAG' => 'asc-anzen-v1.0.0-b17-r01/other' }
]
invalid.each do |values|
  begin
    AscConfig.read(base.merge(values))
  rescue RuntimeError
    next
  end
  raise 'Invalid listing/submission accepted'
end
puts 'ASC exact app/version/tag and hard submission guards PASS'
