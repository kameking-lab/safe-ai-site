# Read-only; run after prepare and again after Codemagic applies profiles.
require 'xcodeproj'
require 'json'

bundle_id = 'jp.anzen-ai-portal.app'
project = Xcodeproj::Project.open('ios/App/App.xcodeproj')
target = project.targets.find { |item| item.name == 'App' }
raise 'App target/configurations missing' unless target && !target.build_configurations.empty?
target.build_configurations.each do |configuration|
  settings = configuration.build_settings
  raise "Bundle ID mismatch in #{configuration.name}" unless settings['PRODUCT_BUNDLE_IDENTIFIER'] == bundle_id
  number = settings['CURRENT_PROJECT_VERSION'].to_s
  raise "Build number mismatch in #{configuration.name}" unless number.match?(/\A[1-9]\d*\z/) && (!ENV.key?('BUILD_NUMBER') || number == ENV['BUILD_NUMBER'])
  raise 'iPhone deployment settings mismatch' unless settings['TARGETED_DEVICE_FAMILY'] == '1' && settings['IPHONEOS_DEPLOYMENT_TARGET'] == '16.0'
  raise 'Entitlements not assigned' unless settings['CODE_SIGN_ENTITLEMENTS'] == 'App/App.entitlements'
end
plist = Xcodeproj::Plist.read_from_path('ios/App/App/Info.plist')
raise 'Info.plist Bundle ID mismatch' unless plist['CFBundleIdentifier'] == '$(PRODUCT_BUNDLE_IDENTIFIER)'
raise 'Info.plist build number must use Xcode setting' unless plist['CFBundleVersion'] == '$(CURRENT_PROJECT_VERSION)'
raise 'Info.plist marketing version mismatch' unless plist['CFBundleShortVersionString'] == '$(MARKETING_VERSION)'
urls = [{ 'CFBundleURLName' => "#{bundle_id}.auth", 'CFBundleURLSchemes' => ['anzenai'] }]
raise 'Auth URL scheme mismatch' unless plist['CFBundleURLTypes'] == urls
raise 'Japanese display name missing' unless plist['CFBundleDisplayName'] == '安全AIポータル'
config = JSON.parse(File.read('ios/App/App/capacitor.config.json'))
raise 'Native runtime Bundle ID mismatch' unless config['appId'] == bundle_id
raise 'Remote WebView is forbidden' if config.fetch('server', {}).key?('url')
apns = Xcodeproj::Plist.read_from_path('ios/App/App/App.entitlements')['aps-environment']
raise 'APNs environment mismatch' unless apns == ENV.fetch('ANZEN_APNS_ENVIRONMENT', 'development')
raise 'Native plugin not compiled' unless target.source_build_phase.files_references.count { |f| f.path == 'NativeVault.swift' } == 1
raise 'Privacy manifest not bundled' unless target.resources_build_phase.files_references.count { |f| f.path == 'PrivacyInfo.xcprivacy' } == 1
raise 'Privacy manifest differs from source' unless File.binread('ios/App/App/PrivacyInfo.xcprivacy') == File.binread('ios-resources/PrivacyInfo.xcprivacy')
raise 'Native plugin differs from source' unless File.binread('ios/App/App/NativeVault.swift') == File.binread('ios-resources/NativeVault.swift')
raise 'Bridge storyboard missing' unless File.read('ios/App/App/Base.lproj/Main.storyboard').include?('customClass="AnzenBridgeViewController" customModule="App"')
delegate = File.read('ios/App/App/AppDelegate.swift')
raise 'Push callbacks missing' unless %w[capacitorDidRegisterForRemoteNotifications capacitorDidFailToRegisterForRemoteNotifications].all? { |name| delegate.include?(name) }
raise 'Usage: verify-ios.rb [export_options.plist]' if ARGV.length > 1
if ARGV.first
  options = Xcodeproj::Plist.read_from_path(ARGV.first)
  raise 'App Store export method required' unless %w[app-store app-store-connect].include?(options['method'])
  profiles = options.fetch('provisioningProfiles', {})
  raise 'App Store profile missing for registered Bundle ID' unless profiles.keys == [bundle_id] && !profiles[bundle_id].to_s.empty?
  raise 'Production APNs required for App Store' unless apns == 'production'
  target.build_configurations.each do |configuration|
    settings = configuration.build_settings
    raise 'Signing team missing' if settings['DEVELOPMENT_TEAM'].to_s.empty?
    attributes = project.root_object.attributes.fetch('TargetAttributes', {}).fetch(target.uuid, {})
    automatic = attributes['ProvisioningStyle'] == 'Automatic' && settings['CODE_SIGN_STYLE'] != 'Manual'
    raise 'Provisioning profile missing' unless automatic || !settings['PROVISIONING_PROFILE_SPECIFIER'].to_s.empty?
  end
end
puts "Verified #{bundle_id}, all App configurations, resources and native runtime."
